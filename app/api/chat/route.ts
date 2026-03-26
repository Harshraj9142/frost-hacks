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

    const { message, courseId, conversationHistory, focusedDocumentId } = await req.json();

    console.log("Chat request received:", {
      messageLength: message?.length,
      courseId,
      focusedDocumentId,
      hasFocus: !!focusedDocumentId,
    });

    if (!message || !courseId) {
      return NextResponse.json(
        { error: "Message and courseId are required" },
        { status: 400 }
      );
    }

    // Query relevant documents from Pinecone using semantic search
    // Retrieve more chunks for better context coverage
    let relevantDocs;
    
    if (focusedDocumentId) {
      console.log("Querying with document focus:", focusedDocumentId);
      // If focused on a specific document, retrieve more chunks for better coverage
      relevantDocs = await queryVectors(message, courseId, 8, focusedDocumentId);
      console.log("Focused query returned:", relevantDocs.length, "results");
    } else {
      console.log("Querying all documents in course");
      // Query all documents in the course with more results
      relevantDocs = await queryVectors(message, courseId, 10);
      console.log("General query returned:", relevantDocs.length, "results");
    }

    if (relevantDocs.length === 0) {
      const focusMessage = focusedDocumentId 
        ? "I don't have information about that in the focused document. Try asking about a different topic from this document, or remove the document focus to search all course materials."
        : "I don't have any course materials uploaded yet for this topic. Here's what you can do:\n\n1. Ask your instructor to upload relevant documents\n2. Try asking about a different topic that might be covered\n3. Rephrase your question to be more specific\n\nWhat else would you like to explore?";
      
      return NextResponse.json({
        response: focusMessage,
        sources: [],
        noContext: true,
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Use a more lenient threshold for better coverage (0.60 instead of 0.65)
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= 0.60);
    
    if (highQualityDocs.length === 0) {
      // Provide helpful response even with low-quality matches
      const bestMatch = relevantDocs[0];
      const focusNote = focusedDocumentId 
        ? " in the focused document" 
        : "";
      
      return NextResponse.json({
        response: `I found some course materials${focusNote}, but they don't seem closely related to your specific question. The closest topic I found is about "${bestMatch.text.substring(0, 100)}..."\n\nWould you like to:\n1. Explore this related topic?\n2. Rephrase your question?\n3. ${focusedDocumentId ? "Remove document focus and search all materials?" : "Ask about something else from the course materials?"}`,
        sources: relevantDocs.slice(0, 2).map((doc) => ({
          fileName: doc.metadata.fileName,
          text: doc.text.substring(0, 200) + "...",
          score: doc.score,
        })),
        lowRelevance: true,
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Build context from retrieved documents with better organization
    // Group by relevance tiers for better context understanding
    const veryHighRelevance = highQualityDocs.filter(doc => doc.score >= 0.80);
    const highRelevance = highQualityDocs.filter(doc => doc.score >= 0.70 && doc.score < 0.80);
    const mediumRelevance = highQualityDocs.filter(doc => doc.score >= 0.60 && doc.score < 0.70);

    let context = "";
    
    if (veryHighRelevance.length > 0) {
      context += "=== HIGHLY RELEVANT INFORMATION ===\n\n";
      context += veryHighRelevance
        .map((doc, i) => `[Source ${i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }
    
    if (highRelevance.length > 0) {
      if (context) context += "\n\n";
      context += "=== RELEVANT SUPPORTING INFORMATION ===\n\n";
      context += highRelevance
        .map((doc, i) => `[Source ${veryHighRelevance.length + i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }
    
    if (mediumRelevance.length > 0) {
      if (context) context += "\n\n";
      context += "=== ADDITIONAL CONTEXT ===\n\n";
      context += mediumRelevance
        .map((doc, i) => `[Source ${veryHighRelevance.length + highRelevance.length + i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }

    // Create system prompt for RAG with strict context-only enforcement and accuracy focus
    const systemPrompt = `You are an expert AI tutor using the Socratic method to help students learn deeply and critically.

CRITICAL ACCURACY RULES:
1. ONLY use information EXPLICITLY stated in the provided context below
2. If information is not in the context, clearly state: "This specific information isn't covered in your course materials"
3. NEVER infer, assume, or add information not present in the context
4. When uncertain, acknowledge it: "Based on the materials, it seems..." or "The context suggests..."
5. Cite which source you're referencing: "According to Source 1..." or "The materials mention..."
6. If context is ambiguous or incomplete, point this out to the student

RESPONSE ACCURACY CHECKLIST:
✓ Every fact comes directly from the context
✓ Technical terms match exactly as written in context
✓ Numbers, dates, and specifics are accurate to the source
✓ Relationships between concepts are as stated in context
✓ No external knowledge or common sense assumptions

CORE PRINCIPLES:
1. Guide students to discover answers through thoughtful questioning
2. Break down complex topics into digestible pieces
3. Encourage critical thinking and self-discovery
4. Be encouraging, patient, and supportive
5. Maintain strict fidelity to source material

RESPONSE FORMATTING:
- Use clear paragraphs separated by double newlines
- Format questions on separate lines for emphasis
- Use numbered lists (1. 2. 3.) for sequential steps or multiple points
- Use bullet points (- or •) for related items or examples
- Keep paragraphs concise (2-3 sentences max)
- Use backticks for technical terms or code: \`term\`
- End questions with ? on their own line for emphasis

RESPONSE STRUCTURE:
- Start with acknowledgment of their question (1 sentence)
- Reference the relevant source material explicitly
- Ask 2-3 guiding questions that lead to understanding
- Provide hints that directly quote or paraphrase the context
- End with encouragement to think deeper (1 sentence)

SOCRATIC TECHNIQUES (using only context):
- Ask clarifying questions: "What do you already know about [concept from context]?"
- Probe assumptions: "Why do you think [fact from context] is important?"
- Explore implications: "Based on [source info], what would happen if...?"
- Question the question: "Looking at [source], what specifically are you trying to understand?"
- Seek evidence: "What in Source X supports that idea?"

TONE:
- Warm and encouraging
- Intellectually curious
- Patient and supportive
- Never condescending
- Honest about limitations of available materials
- Celebrate thinking, not just correct answers

EXAMPLE FORMAT:
Great question about [topic]! Let me help you explore this based on your course materials.

According to Source 1, [key fact from context]. 

What do you think this means in the context of [related concept from materials]?

Here are some hints from your course materials:
- [Direct reference to Source X]
- [Direct reference to Source Y]
- [Direct reference to Source Z]

Think about how these concepts connect. What patterns do you notice in the materials?

CONTEXT FROM COURSE MATERIALS:
${context}

CRITICAL REMINDER:
- Stay within the bounds of the provided context
- If asked about something not in context, redirect to what IS available
- Accuracy over completeness - it's better to say "I don't know" than to guess
- Your credibility depends on being truthful about what the materials contain

Remember: Your goal is to help students THINK about the ACTUAL course materials, not to teach them from your general knowledge.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (last 8 messages for better context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq with parameters optimized for accuracy
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.6, // Lower temperature for more accurate, focused responses
      max_tokens: 700, // More space for detailed, accurate responses
      top_p: 0.9, // Slightly lower for more focused responses
      frequency_penalty: 0.4, // Reduce repetition
      presence_penalty: 0.3, // Encourage diverse but accurate responses
    });

    const response = completion.choices[0].message.content;

    // Analyze response quality
    const hasQuestions = (response?.match(/\?/g) || []).length >= 2;
    const hasEncouragement = /great|excellent|good|well done|keep|think|consider|explore/i.test(response || "");
    
    // Format sources with relevance scores and context
    const sources = highQualityDocs.map((doc) => ({
      fileName: doc.metadata.fileName,
      text: doc.text.substring(0, 250) + "...",
      score: doc.score,
      chunkIndex: doc.metadata.chunkIndex,
      courseId: doc.metadata.courseId,
    }));

    return NextResponse.json({
      response,
      sources,
      metadata: {
        relevantDocsCount: highQualityDocs.length,
        totalDocsSearched: relevantDocs.length,
        avgRelevanceScore: (highQualityDocs.reduce((sum, doc) => sum + doc.score, 0) / highQualityDocs.length).toFixed(2),
        hasSocraticQuestions: hasQuestions,
        isEncouraging: hasEncouragement,
        responseLength: response?.length || 0,
        focusedDocument: focusedDocumentId || null,
        documentFocused: !!focusedDocumentId,
      },
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    
    // Provide helpful error message
    const errorMessage = error.message?.includes("rate limit") 
      ? "I'm experiencing high demand right now. Please try again in a moment."
      : error.message?.includes("timeout")
      ? "The request took too long. Please try asking a more specific question."
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
