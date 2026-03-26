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
    let relevantDocs;
    
    if (focusedDocumentId) {
      console.log("Querying with document focus:", focusedDocumentId);
      // If focused on a specific document, only query that document
      relevantDocs = await queryVectors(message, courseId, 5, focusedDocumentId);
      console.log("Focused query returned:", relevantDocs.length, "results");
    } else {
      console.log("Querying all documents in course");
      // Query all documents in the course
      relevantDocs = await queryVectors(message, courseId, 5);
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

    // Filter out low-relevance results (score < 0.65)
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= 0.65);
    
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

    // Build context from retrieved documents with relevance scores
    const context = highQualityDocs
      .map((doc, i) => `[Source ${i + 1}] (Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
      .join("\n\n---\n\n");

    // Create system prompt for RAG with strict context-only enforcement
    const systemPrompt = `You are an expert AI tutor using the Socratic method to help students learn deeply and critically.

CORE PRINCIPLES:
1. ONLY use information from the provided context - never use external knowledge
2. Guide students to discover answers through thoughtful questioning
3. Break down complex topics into digestible pieces
4. Encourage critical thinking and self-discovery
5. Be encouraging, patient, and supportive

RESPONSE STRUCTURE:
- Start with acknowledgment of their question
- Ask 2-3 guiding questions that lead to understanding
- Provide hints that reference the context
- End with encouragement to think deeper

SOCRATIC TECHNIQUES:
- Ask clarifying questions: "What do you already know about...?"
- Probe assumptions: "Why do you think that is?"
- Explore implications: "What would happen if...?"
- Question the question: "What specifically are you trying to understand?"
- Seek evidence: "What in the material supports that?"

TONE:
- Warm and encouraging
- Intellectually curious
- Patient and supportive
- Never condescending
- Celebrate thinking, not just correct answers

CONTEXT FROM COURSE MATERIALS:
${context}

CRITICAL RULES:
- If the context doesn't contain relevant information, say: "I don't have information about that specific topic in the course materials. Let's explore what we do have - [mention related topics from context]."
- Never make up information
- Always tie questions back to the provided context
- Reference specific concepts from the context in your questions
- If partially covered, focus only on what's in the context

Remember: Your goal is to help students THINK, not just give them answers. Guide them to discover knowledge themselves.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (last 6 messages for better context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq with optimized parameters
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.8, // Higher for more creative Socratic questions
      max_tokens: 600, // More space for thoughtful responses
      top_p: 0.95,
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.2, // Encourage diverse responses
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
