import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryVectors } from "@/lib/vector-store";
import Groq from "groq-sdk";
import connectDB from "@/lib/mongodb";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, courseId, topic, difficulty, count } = await req.json();

    if (!type || !courseId) {
      return NextResponse.json(
        { error: "Type and courseId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Query relevant documents
    const query = topic || "course content overview";
    const relevantDocs = await queryVectors(query, courseId, 5);

    if (relevantDocs.length === 0) {
      return NextResponse.json(
        { error: "No course materials found" },
        { status: 404 }
      );
    }

    // Build context from documents
    const context = relevantDocs
      .map((doc, i) => `[Source ${i + 1}]\n${doc.text}`)
      .join("\n\n---\n\n");

    let systemPrompt = "";
    let userPrompt = "";

    // Generate based on type
    switch (type) {
      case "flashcards":
        systemPrompt = `You are an expert educational content creator. Generate flashcards from course materials.

RULES:
1. Create ${count || 10} flashcards
2. Each flashcard has a question (front) and answer (back)
3. Questions should test understanding, not just memorization
4. Answers should be clear and concise
5. Difficulty level: ${difficulty || "medium"}
6. Use ONLY information from the provided context
7. Return valid JSON array format

FORMAT:
[
  {
    "id": 1,
    "question": "What is...",
    "answer": "...",
    "difficulty": "easy|medium|hard",
    "topic": "specific topic"
  }
]`;

        userPrompt = `Generate ${count || 10} flashcards from this course material${topic ? ` focusing on: ${topic}` : ""}:

${context}

Return ONLY the JSON array, no additional text.`;
        break;

      case "quiz":
        systemPrompt = `You are an expert quiz creator. Generate multiple-choice questions from course materials.

RULES:
1. Create ${count || 5} multiple-choice questions
2. Each question has 4 options (A, B, C, D)
3. Only ONE correct answer
4. Include brief explanations for correct answers
5. Difficulty level: ${difficulty || "medium"}
6. Use ONLY information from the provided context
7. Return valid JSON array format

FORMAT:
[
  {
    "id": 1,
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation",
    "difficulty": "easy|medium|hard",
    "topic": "specific topic"
  }
]`;

        userPrompt = `Generate ${count || 5} quiz questions from this course material${topic ? ` focusing on: ${topic}` : ""}:

${context}

Return ONLY the JSON array, no additional text.`;
        break;

      case "practice":
        systemPrompt = `You are an expert at creating practice problems. Generate challenging problems from course materials.

RULES:
1. Create ${count || 5} practice problems
2. Each problem should test understanding and application
3. Provide 2-3 progressive hints
4. Include detailed solution with explanation
5. Difficulty level: ${difficulty || "medium"}
6. Use ONLY information from the provided context
7. Return valid JSON array format

FORMAT:
[
  {
    "id": 1,
    "problem": "Problem statement...",
    "hints": ["Hint 1", "Hint 2", "Hint 3"],
    "solution": "Detailed solution with explanation",
    "difficulty": "easy|medium|hard",
    "topic": "specific topic"
  }
]`;

        userPrompt = `Generate ${count || 5} practice problems from this course material${topic ? ` focusing on: ${topic}` : ""}:

${context}

Return ONLY the JSON array, no additional text.`;
        break;

      case "summary":
        systemPrompt = `You are an expert at creating concise, clear summaries of educational content.

RULES:
1. Create a comprehensive summary
2. Highlight key concepts and main ideas
3. Use bullet points for clarity
4. Difficulty level: ${difficulty || "medium"}
5. Use ONLY information from the provided context
6. Return valid JSON format

FORMAT:
{
  "title": "Summary Title",
  "keyPoints": ["Point 1", "Point 2", ...],
  "mainConcepts": ["Concept 1", "Concept 2", ...],
  "summary": "Detailed summary text"
}`;

        userPrompt = `Create a summary of this course material${topic ? ` focusing on: ${topic}` : ""}:

${context}

Return ONLY the JSON object, no additional text.`;
        break;

      case "studyplan":
        systemPrompt = `You are an expert study planner. Create a structured study plan from course materials.

RULES:
1. Break content into manageable study sessions
2. Suggest time estimates for each session
3. Order topics logically (prerequisites first)
4. Include review sessions
5. Difficulty level: ${difficulty || "medium"}
6. Use ONLY information from the provided context
7. Return valid JSON format

FORMAT:
{
  "totalDuration": "estimated hours",
  "sessions": [
    {
      "id": 1,
      "title": "Session title",
      "topics": ["Topic 1", "Topic 2"],
      "duration": "minutes",
      "objectives": ["Objective 1", "Objective 2"],
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

        userPrompt = `Create a study plan for this course material${topic ? ` focusing on: ${topic}` : ""}:

${context}

Return ONLY the JSON object, no additional text.`;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type" },
          { status: 400 }
        );
    }

    // Generate content using Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0].message.content;

    // Parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response?.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", response);
      return NextResponse.json(
        { error: "Failed to parse AI response", rawResponse: response },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      sources: relevantDocs.map((doc) => ({
        fileName: doc.metadata.fileName,
        score: doc.score,
      })),
    });
  } catch (error: any) {
    console.error("Learn generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
