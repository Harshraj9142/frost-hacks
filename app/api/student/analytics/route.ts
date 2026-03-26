import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StudentActivity from "@/models/StudentActivity";
import QueryLog from "@/models/QueryLog";
import SavedContent from "@/models/SavedContent";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const timeRange = searchParams.get("timeRange") || "7d"; // 7d, 30d, 90d, all

    await connectDB();

    // Calculate date range
    const now = new Date();
    let startDate = new Date(0); // Beginning of time
    
    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Build query filter
    const filter: any = { studentId: session.user.id };
    if (courseId) {
      filter.courseId = courseId;
    }

    // Fetch student activities
    const activities = await StudentActivity.find(filter).lean();

    // Fetch query logs with date filter
    const queryFilter = { ...filter, createdAt: { $gte: startDate } };
    const queryLogs = await QueryLog.find(queryFilter)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch saved content
    const savedContent = await SavedContent.find(filter).lean();

    // Calculate overall metrics
    const totalQueries = queryLogs.length;
    const totalDocumentsAccessed = new Set(
      activities.flatMap(a => a.documentsAccessed)
    ).size;
    const totalTimeSpent = activities.reduce((sum, a) => sum + a.totalTimeSpent, 0);
    const avgResponseTime = queryLogs.length > 0
      ? queryLogs.reduce((sum, q) => sum + q.responseTime, 0) / queryLogs.length
      : 0;

    // Calculate queries per day
    const queriesByDay = queryLogs.reduce((acc, log) => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate queries by hour (for activity heatmap)
    const queriesByHour = queryLogs.reduce((acc, log) => {
      const hour = new Date(log.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Calculate most accessed documents
    const documentAccess = queryLogs.reduce((acc, log) => {
      log.documentsUsed.forEach(doc => {
        acc[doc] = (acc[doc] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topDocuments = Object.entries(documentAccess)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Calculate query length distribution
    const queryLengths = queryLogs.map(q => q.query.length);
    const avgQueryLength = queryLengths.length > 0
      ? queryLengths.reduce((sum, len) => sum + len, 0) / queryLengths.length
      : 0;

    // Calculate response satisfaction (if tracked)
    const satisfiedQueries = queryLogs.filter(q => q.satisfied === true).length;
    const unsatisfiedQueries = queryLogs.filter(q => q.satisfied === false).length;
    const satisfactionRate = totalQueries > 0
      ? (satisfiedQueries / (satisfiedQueries + unsatisfiedQueries)) * 100
      : null;

    // Calculate learning streaks
    const uniqueDates = [...new Set(
      queryLogs.map(q => new Date(q.createdAt).toISOString().split('T')[0])
    )].sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i > 0) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if today is in the streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      currentStreak = tempStreak;
    }

    // Calculate saved content by type
    const savedByType = savedContent.reduce((acc, content) => {
      acc[content.type] = (acc[content.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate activity by course
    const activityByCourse = activities.map(activity => ({
      courseId: activity.courseId,
      queryCount: activity.queryCount,
      documentsAccessed: activity.documentsAccessed.length,
      timeSpent: activity.totalTimeSpent,
      lastActive: activity.lastActive,
    }));

    // Recent activity timeline
    const recentActivity = queryLogs.slice(0, 20).map(log => ({
      id: log._id,
      query: log.query.substring(0, 100),
      courseId: log.courseId,
      documentsUsed: log.documentsUsed,
      responseTime: log.responseTime,
      createdAt: log.createdAt,
    }));

    // Calculate peak learning times
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: queriesByHour[hour] || 0,
    }));

    // Calculate weekly pattern
    const weeklyPattern = queryLogs.reduce((acc, log) => {
      const day = new Date(log.createdAt).getDay(); // 0 = Sunday
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const weeklyActivity = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
      day,
      count: weeklyPattern[index] || 0,
    }));

    // Calculate learning velocity (queries per week over time)
    const weeklyVelocity: Record<string, number> = {};
    queryLogs.forEach(log => {
      const date = new Date(log.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyVelocity[weekKey] = (weeklyVelocity[weekKey] || 0) + 1;
    });

    const velocityData = Object.entries(weeklyVelocity)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    return NextResponse.json({
      overview: {
        totalQueries,
        totalDocumentsAccessed,
        totalTimeSpent,
        avgResponseTime: Math.round(avgResponseTime),
        avgQueryLength: Math.round(avgQueryLength),
        satisfactionRate,
        currentStreak,
        longestStreak,
      },
      charts: {
        queriesByDay: Object.entries(queriesByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
        topDocuments,
        hourlyActivity,
        weeklyActivity,
        velocityData,
      },
      activity: {
        byCourse: activityByCourse,
        recent: recentActivity,
      },
      savedContent: {
        total: savedContent.length,
        byType: savedByType,
      },
      timeRange,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message },
      { status: 500 }
    );
  }
}
