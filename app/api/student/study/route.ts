import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StudentDocumentModel from "@/models/StudentDocument";
import { queryVectors } from "@/lib/vector-store";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message, documentId, conversationHistory } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // If documentId is provided, verify it belongs to the student
    if (documentId) {
      const document = await StudentDocumentModel.findOne({
        _id: documentId,
        studentId: session.user.id,
      });

      if (!document) {
        return NextResponse.json(
          { error: "Document not found or access denied" },
          { status: 404 }
        );
      }

      if (document.status !== "indexed") {
        return NextResponse.json(
          { error: `Document is ${document.status}. Please wait for indexing to complete.` },
          { status: 400 }
        );
      }
    }

    // Query vectors from student's documents
    // Use studentId as a filter to only search student's own documents
    const relevantDocs = await queryVectors(
      message, 
      null, // no courseId for student documents
      10,
      documentId || undefined,
      session.user.id // pass studentId to filter
    );

    if (relevantDocs.length === 0) {
      const noContextMessage = documentId
        ? "I don't have information about that in this document. Try asking about a different topic from your document."
        : "I don't have any documents to answer from. Please upload some documents first.";
      
      return NextResponse.json({
        response: noContextMessage,
        sources: [],
        noContext: true,
      });
    }

    // Build context from retrieved documents
    let context = "=== STUDENT'S DOCUMENTS (Ordered by Relevance) ===\n\n";
    
    relevantDocs.forEach((doc, i) => {
      const sourceNum = i + 1;
      const relevancePercent = (doc.score * 100).toFixed(1);
      context += `[Source ${sourceNum}] (${doc.metadata.fileName}, Relevance: ${relevancePercent}%)\n`;
      context += `${doc.text}\n\n`;
      if (i < relevantDocs.length - 1) {
        context += "---\n\n";
      }
    });

    // Create system prompt for studying
    const systemPrompt = `You are an expert AI tutor helping a student study from their personal documents.

CRITICAL RULES:
1. ONLY use information from the provided context below
2. Be clear, accurate, and helpful
3. Cite sources using [Source X] notation
4. If information is not in the context, say so clearly
5. Help the student understand and learn the material
6. Break down complex concepts into simpler parts
7. Provide examples when they exist in the context

CONTEXT FROM STUDENT'S DOCUMENTS:
${context}

TEACHING APPROACH:
1. Answer the question directly and clearly
2. Explain concepts in an easy-to-understand way
3. Use examples from the documents when available
4. Cite which source you're using
5. If the student seems confused, offer to explain differently

RESPONSE FORMATTING:
- Start with a clear answer
- Use bullet points for lists
- Use numbered steps for processes
- Keep paragraphs short and readable
- Use **bold** for key terms
- End with a summary or key takeaway

Remember: You're helping the student learn from THEIR OWN documents. Be supportive and encouraging!`;

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.4,
      max_tokens: 1000,
      top_p: 0.9,
    });

    const response = completion.choices[0].message.content;

    // Format sources
    const sources = relevantDocs.map((doc, index) => ({
      fileName: doc.metadata.fileName,
      text: doc.text.substring(0, 300) + "...",
      score: doc.score,
      sourceNumber: index + 1,
    }));

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      response,
      sources,
      metadata: {
        relevantDocsCount: relevantDocs.length,
        responseTime,
        documentId: documentId || null,
      },
    });
  } catch (error: any) {
    console.error("Study error:", error);
    
    const errorMessage = error.message?.includes("rate limit") 
      ? "I'm experiencing high demand right now. Please try again in a moment."
      : "I encountered an error processing your question. Please try again.";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        technicalError: error.message 
      },
      { status: 500 }
    );
  }
}
