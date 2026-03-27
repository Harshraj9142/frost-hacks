import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const cookieHeader = req.headers.get("cookie") || "";

    // Call the test-scope endpoint
    const testRes = await fetch(`${baseUrl}/api/test-scope`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ courseId }),
    });

    if (!testRes.ok) {
      const err = await testRes.json();
      return NextResponse.json(
        { error: err.error || "Test scope failed" },
        { status: 500 }
      );
    }

    const report = await testRes.json();

    // Build formatted report
    const validationReport = {
      title: "RAG Scope Validation Report",
      generatedAt: new Date().toISOString(),
      courseId: report.courseId,
      summary: {
        overallScore: `${report.overallScore}%`,
        verdict:
          report.overallScore >= 90
            ? "EXCELLENT"
            : report.overallScore >= 75
            ? "GOOD"
            : report.overallScore >= 60
            ? "NEEDS IMPROVEMENT"
            : "FAILING",
        avgResponseTime: `${report.avgResponseTime}ms`,
      },
      inScopeMetrics: {
        accuracy: `${report.inScope.accuracy}%`,
        correctlyAnswered: `${report.inScope.correctlyAnswered}/${report.inScope.total}`,
        incorrectlyRefused: report.inScope.incorrectlyRefused,
      },
      outOfScopeMetrics: {
        refusalRate: `${report.outOfScope.refusalRate}%`,
        correctlyRefused: `${report.outOfScope.correctlyRefused}/${report.outOfScope.total}`,
        incorrectlyAnswered: report.outOfScope.incorrectlyAnswered,
      },
      details: report.details.map(
        (d: any) => ({
          question: d.question,
          category: d.category,
          result: d.isCorrectBehavior ? "✅ PASS" : "❌ FAIL",
          wasRefused: d.wasRefused,
          scopeReason: d.scopeReason || "N/A",
          bestScore: d.bestScore || "N/A",
          responseTime: `${d.responseTime}ms`,
          responsePreview: d.response.substring(0, 150) + "...",
        })
      ),
    };

    return NextResponse.json(validationReport);
  } catch (error: any) {
    console.error("Validation report error:", error);
    return NextResponse.json(
      { error: error.message || "Report generation failed" },
      { status: 500 }
    );
  }
}
