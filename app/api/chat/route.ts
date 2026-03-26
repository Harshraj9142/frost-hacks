import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryVectors } from "@/lib/vector-store";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message, courseId, conversationHistory } = await req.json();

    if (!message || !courseId) {
      return NextResponse.json(
        { error: "Message and courseId are required" },
        { status: 400 }
      );
    }

    // Query relevant documents from Pinecone using semantic search
    const relevantDocs = await queryVectors(message, courseId, 5);

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        response: "I don't have any information about that topic in the course materials. Please ask your instructor to upload relevant documents, or try rephrasing your question to match the available content.",
        sources: [],
      });
    }

    // Filter out low-relevance results (score < 0.7)
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= 0.7);
    
    if (highQualityDocs.length === 0) {
      return NextResponse.json({
        response: "I found some course materials, but they don't seem closely related to your question. Could you rephrase your question or ask about a different topic covered in the course materials?",
        sources: relevantDocs.map((doc) => ({
          fileName: doc.metadata.fileName,
          text: doc.text.substring(0, 200) + "...",
          score: doc.score,
        })),
      });
    }

    // Build context from retrieved documents with relevance scores
    const context = highQualityDocs
      .map((doc, i) => `[Source ${i + 1}] (Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
      .join("\n\n---\n\n");

    // Create system prompt for RAG with strict context-only enforcement
    const systemPrompt = `You are an AI tutor that helps students learn through Socratic questioning. 

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
1. You MUST ONLY use information from the provided context below
2. If the context doesn't contain relevant information, you MUST respond with: "I don't have information about that in the course materials. Please ask your instructor to upload relevant documents or rephrase your question."
3. NEVER make up, infer, or use external knowledge not present in the context
4. NEVER answer questions about topics not covered in the context
5. Use Socratic questioning to guide students to understanding
6. Don't give direct answers - ask guiding questions that lead students to discover the answer
7. Always reference specific parts of the context when responding
8. If a student asks about something partially covered, only discuss what's in the context

CONTEXT FROM COURSE MATERIALS:
${context}

IMPORTANT: The above context is the ONLY source of truth. If the student's question cannot be answered using ONLY this context, you must tell them you don't have that information in the course materials. Do not use any knowledge outside of this context.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (last 5 messages for context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-5);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq (much faster than OpenAI)
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Fast and capable model
      messages,
      temperature: 0.7, // Balanced creativity
      max_tokens: 500,
      top_p: 0.9, // Nucleus sampling for better quality
    });

    const response = completion.choices[0].message.content;

    // Format sources with relevance scores
    const sources = highQualityDocs.map((doc) => ({
      fileName: doc.metadata.fileName,
      text: doc.text.substring(0, 200) + "...",
      score: doc.score,
      chunkIndex: doc.metadata.chunkIndex,
    }));

    return NextResponse.json({
      response,
      sources,
      relevantDocsCount: highQualityDocs.length,
      totalDocsSearched: relevantDocs.length,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat" },
      { status: 500 }
    );
  }
}
