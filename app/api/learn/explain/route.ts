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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, concept, difficulty } = await req.json();

    if (!courseId || !concept) {
      return NextResponse.json(
        { error: "CourseId and concept are required" },
        { status: 400 }
      );
    }

    // Query relevant documents
    const relevantDocs = await queryVectors(concept, courseId, 5);

    if (relevantDocs.length === 0) {
      return NextResponse.json(
        { error: "No course materials found for this concept" },
        { status: 404 }
      );
    }

    // Build context
    const context = relevantDocs
      .map((doc, i) => `[Source ${i + 1}]\n${doc.text}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are an expert educator. Explain concepts clearly and thoroughly based on course materials.

RULES:
1. Explain the concept in a clear, understandable way
2. Use examples from the course materials when possible
3. Break down complex ideas into simpler parts
4. Difficulty level: ${difficulty || "medium"}
5. Use ONLY information from the provided context
6. If the concept isn't in the materials, say so clearly
7. Keep explanation focused and concise (2-3 paragraphs)

STYLE:
- Start with a clear definition
- Provide context and examples
- Explain why it matters
- Use analogies if helpful
- End with key takeaways`;

    const userPrompt = `Explain this concept based on the course materials: ${concept}

COURSE MATERIALS:
${context}

Provide a clear, educational explanation.`;

    // Generate explanation
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const explanation = completion.choices[0].message.content;

    return NextResponse.json({
      success: true,
      explanation,
      sources: relevantDocs.map((doc) => ({
        fileName: doc.metadata.fileName,
        score: doc.score,
      })),
    });
  } catch (error: any) {
    console.error("Explain error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to explain concept" },
      { status: 500 }
    );
  }
}
