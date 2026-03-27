import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 10 universally out-of-scope questions (unrelated to any academic course)
const OUT_OF_SCOPE_QUESTIONS = [
  "What is the recipe for butter chicken?",
  "Who won the FIFA World Cup in 2022?",
  "How do I fix a leaking kitchen faucet?",
  "What are the latest celebrity gossip headlines?",
  "Can you write me a poem about sunsets?",
  "What stocks should I invest in right now?",
  "How do I train my dog to sit?",
  "What is the weather forecast for tomorrow in Paris?",
  "Tell me a joke about elephants.",
  "How many calories are in a Big Mac?",
];

// 10 generic in-scope questions (phrased to match typical course material)
const IN_SCOPE_QUESTIONS = [
  "What are the main concepts covered in the course material?",
  "Can you summarize the key points from the uploaded documents?",
  "Explain the most important topic discussed in the materials.",
  "What definitions are provided in the course content?",
  "What examples are given in the course documents?",
  "What are the learning objectives mentioned in the material?",
  "Describe the methodology discussed in the documents.",
  "What conclusions are drawn in the course materials?",
  "What are the key terms defined in the uploaded content?",
  "What is the main argument or thesis presented in the materials?",
];

// Patterns that indicate a rejection/out-of-scope response
const REJECTION_PATTERNS = [
  "outside the provided course material",
  "outside the scope",
  "outside your course material",
  "can only answer questions based on your uploaded",
  "not covered in the uploaded documents",
  "don't have any course materials",
  "don't have information about that",
  "isn't covered in your course materials",
  "not in the context",
  "cannot answer this question",
];

function isRejectionResponse(response: string, isOutOfScope?: boolean): boolean {
  if (isOutOfScope === true) return true;
  const lower = response.toLowerCase();
  return REJECTION_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Get cookies from the incoming request to forward auth
    const cookieHeader = req.headers.get("cookie") || "";

    const results: Array<{
      question: string;
      category: "in-scope" | "out-of-scope";
      response: string;
      wasRefused: boolean;
      isCorrectBehavior: boolean;
      isOutOfScope?: boolean;
      bestScore?: string;
      scopeReason?: string;
      responseTime: number;
    }> = [];

    // Helper to send a question to /api/chat
    async function testQuestion(
      question: string,
      category: "in-scope" | "out-of-scope"
    ) {
      const start = Date.now();
      try {
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({
            message: question,
            courseId,
            conversationHistory: [],
            tutorMode: "direct",
          }),
        });

        const data = await res.json();
        const responseTime = Date.now() - start;
        const responseText = data.response || data.error || "";
        const wasRefused = isRejectionResponse(responseText, data.isOutOfScope);

        const isCorrectBehavior =
          category === "out-of-scope" ? wasRefused : !wasRefused;

        results.push({
          question,
          category,
          response: responseText.substring(0, 300),
          wasRefused,
          isCorrectBehavior,
          isOutOfScope: data.isOutOfScope,
          bestScore: data.bestScore,
          scopeReason: data.scopeReason,
          responseTime,
        });
      } catch (error: any) {
        results.push({
          question,
          category,
          response: `ERROR: ${error.message}`,
          wasRefused: false,
          isCorrectBehavior: false,
          responseTime: Date.now() - start,
        });
      }
    }

    // Run all 20 questions sequentially to avoid rate limits
    for (const q of OUT_OF_SCOPE_QUESTIONS) {
      await testQuestion(q, "out-of-scope");
    }
    for (const q of IN_SCOPE_QUESTIONS) {
      await testQuestion(q, "in-scope");
    }

    // Calculate metrics
    const inScopeResults = results.filter((r) => r.category === "in-scope");
    const outOfScopeResults = results.filter(
      (r) => r.category === "out-of-scope"
    );

    const inScopeCorrect = inScopeResults.filter(
      (r) => r.isCorrectBehavior
    ).length;
    const outOfScopeCorrect = outOfScopeResults.filter(
      (r) => r.isCorrectBehavior
    ).length;

    const report = {
      courseId,
      timestamp: new Date().toISOString(),
      inScope: {
        total: inScopeResults.length,
        correctlyAnswered: inScopeCorrect,
        incorrectlyRefused: inScopeResults.length - inScopeCorrect,
        accuracy: Math.round((inScopeCorrect / inScopeResults.length) * 100),
      },
      outOfScope: {
        total: outOfScopeResults.length,
        correctlyRefused: outOfScopeCorrect,
        incorrectlyAnswered: outOfScopeResults.length - outOfScopeCorrect,
        refusalRate: Math.round(
          (outOfScopeCorrect / outOfScopeResults.length) * 100
        ),
      },
      overallScore: Math.round(
        ((inScopeCorrect + outOfScopeCorrect) / results.length) * 100
      ),
      avgResponseTime: Math.round(
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
      ),
      details: results,
    };

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Test scope error:", error);
    return NextResponse.json(
      { error: error.message || "Test failed" },
      { status: 500 }
    );
  }
}
