import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import QueryLog from "@/models/QueryLog";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get student's enrolled courses
    const student = await User.findById(session.user.id).select("courses");
    const enrolledCourses = student?.courses || [];

    // Get available documents for enrolled courses
    const availableDocuments = await DocumentModel.countDocuments({
      courseId: { $in: enrolledCourses },
      status: "indexed",
    });

    // Get documents by course
    const documentsByCourse = await DocumentModel.aggregate([
      {
        $match: {
          courseId: { $in: enrolledCourses },
          status: "indexed",
        },
      },
      {
        $group: {
          _id: "$courseId",
          count: { $sum: 1 },
          totalChunks: { $sum: "$chunkCount" },
        },
      },
    ]);

    // Get recent documents (last 5)
    const recentDocuments = await DocumentModel.find({
      courseId: { $in: enrolledCourses },
      status: "indexed",
    })
      .sort({ indexedAt: -1 })
      .limit(5)
      .select("fileName courseId indexedAt")
      .lean();

    // Calculate total chunks available
    const totalChunks = documentsByCourse.reduce(
      (sum, doc) => sum + (doc.totalChunks || 0),
      0
    );

    // Calculate study streak
    const studyStreak = await calculateStudyStreak(session.user.id);

    return NextResponse.json({
      stats: {
        enrolledCourses: enrolledCourses.length,
        availableDocuments,
        totalChunks,
        studyStreak,
      },
      documentsByCourse,
      recentDocuments,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

async function calculateStudyStreak(userId: string): Promise<number> {
  try {
    // Get all query logs for this user, sorted by date descending
    const logs = await QueryLog.find({ studentId: userId })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    if (logs.length === 0) return 0;

    // Get unique dates (YYYY-MM-DD format)
    const uniqueDates = new Set<string>();
    logs.forEach((log) => {
      const date = new Date(log.createdAt);
      const dateStr = date.toISOString().split("T")[0];
      uniqueDates.add(dateStr);
    });

    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    if (sortedDates.length === 0) return 0;

    // Check if the most recent activity is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // If the most recent activity is not today or yesterday, streak is broken
    if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
      return 0;
    }

    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(sortedDates[0]);
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split("T")[0];
      
      if (sortedDates[i] === prevDateStr) {
        streak++;
        currentDate = new Date(sortedDates[i]);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating study streak:", error);
    return 0;
  }
}
