import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ResponseFeedback from "@/models/ResponseFeedback";
import QueryLog from "@/models/QueryLog";

/**
 * POST /api/feedback
 * Submit feedback for a query response
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log('Feedback API received:', body);

    const {
      queryLogId,
      rating,
      feedbackCategories,
      issues,
      comment,
      tutorMode,
      hadMultipleDocuments,
      documentCount,
      responseLength,
    } = body;

    // Validate required fields
    if (!queryLogId || !rating) {
      console.error('Missing required fields:', { queryLogId, rating });
      return NextResponse.json(
        { error: "queryLogId and rating are required" },
        { status: 400 }
      );
    }

    // Validate rating
    if (!['helpful', 'not_helpful', 'very_helpful'].includes(rating)) {
      console.error('Invalid rating:', rating);
      return NextResponse.json(
        { error: "Invalid rating value" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if feedback already exists for this query
    const existingFeedback = await ResponseFeedback.findOne({ queryLogId });
    
    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.rating = rating;
      existingFeedback.feedbackCategories = feedbackCategories;
      existingFeedback.issues = issues;
      existingFeedback.comment = comment;
      await existingFeedback.save();

      console.log('Feedback updated:', existingFeedback._id);

      return NextResponse.json({
        success: true,
        message: "Feedback updated successfully",
        feedbackId: existingFeedback._id,
      });
    }

    const courseId = req.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      console.error('Missing courseId in query params');
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Create new feedback
    const feedback = await ResponseFeedback.create({
      queryLogId,
      studentId: session.user.id,
      courseId,
      rating,
      feedbackCategories,
      issues: issues || [],
      comment,
      tutorMode: tutorMode || 'direct',
      hadMultipleDocuments: hadMultipleDocuments || false,
      documentCount: documentCount || 1,
      responseLength: responseLength || 0,
    });

    console.log('Feedback created:', feedback._id);

    // Update QueryLog with satisfaction status
    await QueryLog.findByIdAndUpdate(queryLogId, {
      satisfied: rating === 'very_helpful' || rating === 'helpful',
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: feedback._id,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback?courseId=xxx
 * Get feedback analytics for a course (faculty only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only faculty can view feedback analytics
    if (session.user.role !== "faculty") {
      return NextResponse.json(
        { error: "Forbidden - Faculty only" },
        { status: 403 }
      );
    }

    const courseId = req.nextUrl.searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all feedback for the course
    const allFeedback = await ResponseFeedback.find({ courseId }).sort({ createdAt: -1 });

    // Calculate statistics
    const totalFeedback = allFeedback.length;
    const helpfulCount = allFeedback.filter(f => f.rating === 'helpful' || f.rating === 'very_helpful').length;
    const notHelpfulCount = allFeedback.filter(f => f.rating === 'not_helpful').length;
    const veryHelpfulCount = allFeedback.filter(f => f.rating === 'very_helpful').length;

    // Calculate satisfaction rate
    const satisfactionRate = totalFeedback > 0 
      ? ((helpfulCount / totalFeedback) * 100).toFixed(1)
      : 0;

    // Analyze by tutor mode
    const directModeFeedback = allFeedback.filter(f => f.tutorMode === 'direct');
    const guidedModeFeedback = allFeedback.filter(f => f.tutorMode === 'guided');

    const directSatisfaction = directModeFeedback.length > 0
      ? ((directModeFeedback.filter(f => f.rating === 'helpful' || f.rating === 'very_helpful').length / directModeFeedback.length) * 100).toFixed(1)
      : 0;

    const guidedSatisfaction = guidedModeFeedback.length > 0
      ? ((guidedModeFeedback.filter(f => f.rating === 'helpful' || f.rating === 'very_helpful').length / guidedModeFeedback.length) * 100).toFixed(1)
      : 0;

    // Common issues
    const issueCount: Record<string, number> = {};
    allFeedback.forEach(f => {
      f.issues?.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });

    const topIssues = Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));

    // Average category ratings
    const categoryRatings = {
      accuracy: 0,
      clarity: 0,
      completeness: 0,
      relevance: 0,
      citations: 0,
    };

    let categoryCount = 0;
    allFeedback.forEach(f => {
      if (f.feedbackCategories) {
        categoryRatings.accuracy += f.feedbackCategories.accuracy || 0;
        categoryRatings.clarity += f.feedbackCategories.clarity || 0;
        categoryRatings.completeness += f.feedbackCategories.completeness || 0;
        categoryRatings.relevance += f.feedbackCategories.relevance || 0;
        categoryRatings.citations += f.feedbackCategories.citations || 0;
        categoryCount++;
      }
    });

    if (categoryCount > 0) {
      Object.keys(categoryRatings).forEach(key => {
        categoryRatings[key as keyof typeof categoryRatings] = 
          parseFloat((categoryRatings[key as keyof typeof categoryRatings] / categoryCount).toFixed(2));
      });
    }

    // Recent feedback (last 10)
    const recentFeedback = allFeedback.slice(0, 10).map(f => ({
      id: f._id,
      rating: f.rating,
      tutorMode: f.tutorMode,
      issues: f.issues,
      comment: f.comment,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        totalFeedback,
        helpfulCount,
        notHelpfulCount,
        veryHelpfulCount,
        satisfactionRate: parseFloat(satisfactionRate),
        byMode: {
          direct: {
            total: directModeFeedback.length,
            satisfactionRate: parseFloat(directSatisfaction),
          },
          guided: {
            total: guidedModeFeedback.length,
            satisfactionRate: parseFloat(guidedSatisfaction),
          },
        },
        topIssues,
        categoryRatings,
        recentFeedback,
      },
    });
  } catch (error) {
    console.error("Error fetching feedback analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback analytics" },
      { status: 500 }
    );
  }
}
