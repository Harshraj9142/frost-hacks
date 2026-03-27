import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";
import { validateSocraticResponse } from "@/lib/citations";

/**
 * POST /api/socratic/validate
 * Validate Socratic tutoring responses
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { response, queryId, limit = 20 } = await req.json();

    await connectDB();

    // Single response validation
    if (response || queryId) {
      let responseText = response;
      
      if (queryId && !response) {
        const query = await QueryLog.findById(queryId).lean();
        if (!query) {
          return NextResponse.json({ error: "Query not found" }, { status: 404 });
        }
        responseText = query.response;
      }

      if (!responseText) {
        return NextResponse.json({ error: "Response text required" }, { status: 400 });
      }

      const validation = validateSocraticResponse(responseText);

      return NextResponse.json({
        success: true,
        response: responseText.substring(0, 500) + '...',
        validation: {
          ...validation,
          recommendations: generateRecommendations(validation),
        },
      });
    }

    // Batch validation - analyze recent Socratic mode responses
    const queries = await QueryLog.find({
      response: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const results = [];
    let excellentCount = 0;
    let goodCount = 0;
    let poorCount = 0;
    let failingCount = 0;
    let totalQuestions = 0;
    let responsesWithDirectAnswers = 0;

    for (const query of queries) {
      const validation = validateSocraticResponse(query.response);

      results.push({
        queryId: query._id.toString(),
        query: query.query.substring(0, 100),
        quality: validation.quality,
        questionCount: validation.questionCount,
        hasDirectAnswers: validation.hasDirectAnswers,
        isSocratic: validation.isSocratic,
        issues: validation.issues,
        strengths: validation.strengths,
      });

      totalQuestions += validation.questionCount;
      if (validation.hasDirectAnswers) responsesWithDirectAnswers++;

      if (validation.quality === 'excellent') excellentCount++;
      else if (validation.quality === 'good') goodCount++;
      else if (validation.quality === 'poor') poorCount++;
      else failingCount++;
    }

    const avgQuestions = totalQuestions / results.length;

    return NextResponse.json({
      success: true,
      summary: {
        totalResponses: results.length,
        qualityDistribution: {
          excellent: excellentCount,
          good: goodCount,
          poor: poorCount,
          failing: failingCount,
        },
        percentages: {
          excellent: ((excellentCount / results.length) * 100).toFixed(1),
          good: ((goodCount / results.length) * 100).toFixed(1),
          poor: ((poorCount / results.length) * 100).toFixed(1),
          failing: ((failingCount / results.length) * 100).toFixed(1),
        },
        metrics: {
          averageQuestions: avgQuestions.toFixed(1),
          responsesWithDirectAnswers,
          percentWithDirectAnswers: ((responsesWithDirectAnswers / results.length) * 100).toFixed(1),
        },
      },
      results,
      recommendations: generateBatchRecommendations({
        excellentCount,
        goodCount,
        poorCount,
        failingCount,
        totalResponses: results.length,
        avgQuestions,
        responsesWithDirectAnswers,
      }),
    });
  } catch (error: any) {
    console.error("Socratic validation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate Socratic responses" },
      { status: 500 }
    );
  }
}

function generateRecommendations(validation: ReturnType<typeof validateSocraticResponse>): string[] {
  const recommendations: string[] = [];

  if (validation.quality === 'failing') {
    recommendations.push('🔴 CRITICAL: Response is not following Socratic method');
    recommendations.push('Remove all direct answers and explanations');
    recommendations.push('Focus on asking guiding questions instead');
  }

  if (validation.hasDirectAnswers) {
    recommendations.push('⚠️ Remove direct answers - guide with questions only');
  }

  if (validation.questionCount < 3) {
    recommendations.push(`⚠️ Add more questions (current: ${validation.questionCount}, target: 3-5)`);
  }

  if (!validation.hasGuidingQuestions) {
    recommendations.push('⚠️ Use guiding questions: What/How/Why/Can you...');
  }

  if (!validation.hasHints) {
    recommendations.push('⚠️ Add a hints section with strategic clues');
  }

  if (!validation.hasEncouragement) {
    recommendations.push('⚠️ Add encouragement to motivate thinking');
  }

  if (!validation.hasSections) {
    recommendations.push('⚠️ Structure response with ## headers (Explore, Hints, Think About)');
  }

  if (validation.quality === 'excellent') {
    recommendations.push('✅ Excellent Socratic response! Keep it up!');
  }

  return recommendations;
}

function generateBatchRecommendations(stats: {
  excellentCount: number;
  goodCount: number;
  poorCount: number;
  failingCount: number;
  totalResponses: number;
  avgQuestions: number;
  responsesWithDirectAnswers: number;
}): string[] {
  const recommendations: string[] = [];
  const passRate = ((stats.excellentCount + stats.goodCount) / stats.totalResponses) * 100;

  if (passRate < 70) {
    recommendations.push('🔴 CRITICAL: <70% of responses are good/excellent');
    recommendations.push('Review and strengthen Socratic mode prompt');
  } else if (passRate < 85) {
    recommendations.push('⚠️ WARNING: Pass rate could be improved');
  } else {
    recommendations.push('✅ EXCELLENT: Strong Socratic tutoring performance!');
  }

  if (stats.avgQuestions < 3) {
    recommendations.push(`⚠️ Average questions (${stats.avgQuestions}) below target (3+)`);
  }

  if (stats.responsesWithDirectAnswers > stats.totalResponses * 0.1) {
    recommendations.push('🔴 >10% of responses contain direct answers');
    recommendations.push('Strengthen "no direct answers" enforcement');
  }

  if (stats.failingCount > 0) {
    recommendations.push(`⚠️ ${stats.failingCount} responses are failing Socratic criteria`);
  }

  return recommendations;
}
