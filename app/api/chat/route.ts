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

    const { message, courseId } = await req.json();

    if (!message || !courseId) {
      return NextResponse.json(
        { error: "Message and courseId are required" },
        { status: 400 }
      );
    }

    // Query relevant documents from Pinecone
    const relevantDocs = await queryVectors(message, courseId, 5);

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        response: "I don't have any information about that topic in the course materials. Please ask your instructor to upload relevant documents.",
        sources: [],
      });
    }

    // Build context from retrieved documents
    const context = relevantDocs
      .map((doc, i) => `[${i + 1}] ${doc.text}`)
      .join("\n\n");

    // Create system prompt for RAG
    const systemPrompt = `You are an AI tutor that helps students learn through Socratic questioning. 

CRITICAL RULES:
1. You MUST ONLY use information from the provided context below
2. If the context doesn't contain relevant information, say "I don't have information about that in the course materials"
3. Never make up or infer information not present in the context
4. Use Socratic questioning to guide students to understanding
5. Don't give direct answers - ask guiding questions instead
6. Reference specific parts of the context when relevant

CONTEXT FROM COURSE MATERIALS:
${context}

Remember: Only use the information provided above. If the student's question cannot be answered using this context, politely explain that you don't have that information in the course materials.`;

    // Generate response using Groq (much faster than OpenAI)
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Fast and capable model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;

    // Format sources
    const sources = relevantDocs.map((doc) => ({
      fileName: doc.metadata.fileName,
      text: doc.text.substring(0, 200) + "...",
      score: doc.score,
    }));

    return NextResponse.json({
      response,
      sources,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat" },
      { status: 500 }
    );
  }
}
