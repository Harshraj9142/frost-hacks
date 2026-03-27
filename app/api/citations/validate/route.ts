import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";
import { validateResponseCitations, generateCitationReport, type Citation } from "@/lib/citations";
import { queryVectors } from "@/lib/vector-store";

/**
 * POST /api/citations/validate
 * Validate citations for a specific query or get overall statistics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { queryId, query, response, courseId, limit = 20 } = await req.json();

    await connectDB();

    // Single query validation
    if (queryId || (query && response && courseId)) {
      let queryData;
      
      if (queryId) {
        queryData = await QueryLog.findById(queryId).lean();
        if (!queryData) {
          return NextResponse.json({ error: "Query not found" }, { status: 404 });
        }
      } else {
        queryData = { query, response, courseId };
      }

      // Get relevant documents that should have been cited
      const relevantDocs = await queryVectors(queryData.query, queryData.courseId, 5);

      const citations: Citation[] = relevantDocs.map((doc, index) => ({
        id: `cite-${Date.now()}-${index}`,
        fileName: doc.metadata.fileName,
        fileType: doc.metadata.fileType,
        pageNumber: doc.metadata.pageNumber,
        pageNumbers: doc.metadata.pageNumbers 
          ? (typeof doc.metadata.pageNumbers === 'string' 
              ? doc.metadata.pageNumbers.split(',').map((n: string) => parseInt(n.trim()))
              : doc.metadata.pageNumbers)
          : undefined,
        chunkIndex: doc.metadata.chunkIndex,
        text: doc.text.substring(0, 200),
        fullText: doc.text,
        relevanceScore: doc.score,
        timestamp: new Date().toISOString(),
      }));

      // Validate response citations
      const validation = validateResponseCitations(queryData.response, citations.length);
      const report = generateCitationReport(citations);

      return NextResponse.json({
        success: true,
        query: queryData.query,
        response: queryData.response,
        validation: {
          ...validation,
          availableCitations: citations.length,
          citations: citations.map((c, i) => ({
            index: i + 1,
            fileName: c.fileName,
            pageNumber: c.pageNumber,
            pageNumbers: c.pageNumbers,
            relevanceScore: c.relevanceScore,
            excerpt: c.text,
          })),
        },
        report,
      });
    }

    // Batch validation
    const queries = await QueryLog.find({
      response: { $exists: true, $ne: "" },
      courseId: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const results = [];
    let totalQueries = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let poorCount = 0;
    let noneCount = 0;

    for (const query of queries) {
      try {
        const relevantDocs = await queryVectors(query.query, query.courseId, 5);
        
        if (relevantDocs.length === 0) continue;

        const validation = validateResponseCitations(query.response, relevantDocs.length);

        results.push({
          queryId: query._id.toString(),
          query: query.query.substring(0, 100),
          quality: validation.quality,
          citationCount: validation.citationCount,
          citationDensity: validation.citationDensity,
          sourcesReferenced: validation.sourcesReferenced,
          allSourcesCited: validation.allSourcesCited,
          issues: validation.issues,
        });

        totalQueries++;
        if (validation.quality === 'excellent') excellentCount++;
        else if (validation.quality === 'good') goodCount++;
        else if (validation.quality === 'poor') poorCount++;
        else noneCount++;
      } catch (error) {
        console.error(`Error validating query ${query._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalQueries,
        qualityDistribution: {
          excellent: excellentCount,
          good: goodCount,
          poor: poorCount,
          none: noneCount,
        },
        percentages: {
          excellent: ((excellentCount / totalQueries) * 100).toFixed(1),
          good: ((goodCount / totalQueries) * 100).toFixed(1),
          poor: ((poorCount / totalQueries) * 100).toFixed(1),
          none: ((noneCount / totalQueries) * 100).toFixed(1),
        },
      },
      results,
    });
  } catch (error: any) {
    console.error("Citation validation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate citations" },
      { status: 500 }
    );
  }
}
