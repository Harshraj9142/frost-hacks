import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import StudentActivity from "@/models/StudentActivity";
import QueryLog from "@/models/QueryLog";
import Course from "@/models/Course";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get faculty courses
    const facultyCourses = await Course.find({ facultyId: session.user.id })
      .select("_id")
      .lean();
    const courseIds = facultyCourses.map((c: any) => c._id.toString());
    const courseObjectIds = facultyCourses.map((c: any) => c._id);

    // Get document stats
    const totalDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
    });

    const indexedDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "indexed",
    });

    const processingDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "processing",
    });

    const failedDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "failed",
    });

    // Get total students enrolled in faculty courses
    // Check both string and ObjectId formats for compatibility
    const totalStudents = await User.countDocuments({
      role: "student",
      $or: [
        { courses: { $in: courseIds } },
        { courses: { $in: courseObjectIds } }
      ]
    });

    // Get active students (queried in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeStudents = await StudentActivity.distinct("studentId", {
      courseId: { $in: courseIds },
      lastActive: { $gte: sevenDaysAgo },
    });

    // Get total queries in last 7 days
    const totalQueries = await QueryLog.countDocuments({
      courseId: { $in: courseIds },
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get total queries all time
    const totalQueriesAllTime = await QueryLog.countDocuments({
      courseId: { $in: courseIds },
    });

    // Get average response time
    const avgResponseTime = await QueryLog.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$responseTime" },
        },
      },
    ]);

    // Get recent documents
    const recentDocuments = await DocumentModel.find({
      facultyId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get top students by query count
    const topStudents = await StudentActivity.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      {
        $group: {
          _id: "$studentId",
          totalQueries: { $sum: "$queryCount" },
          lastActive: { $max: "$lastActive" },
        },
      },
      { $sort: { totalQueries: -1 } },
      { $limit: 5 },
    ]);

    // Get student details for top students
    const topStudentIds = topStudents.map((s) => s._id);
    // Filter out invalid ObjectIds (like anonymous user IDs)
    const validStudentIds = topStudentIds.filter((id) => {
      return /^[0-9a-fA-F]{24}$/.test(id.toString());
    });
    const studentDetails = await User.find({
      _id: { $in: validStudentIds },
    })
      .select("name email")
      .lean();

    const topStudentsWithDetails = topStudents.map((student) => {
      const details = studentDetails.find(
        (d: any) => d._id.toString() === student._id
      );
      return {
        id: student._id,
        name: details?.name || "Unknown",
        email: details?.email || "",
        queryCount: student.totalQueries,
        lastActive: student.lastActive,
      };
    });

    // Get recent activity (last 10 queries)
    const recentActivity = await QueryLog.find({
      courseId: { $in: courseIds },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get student details for recent activity
    const activityStudentIds = [
      ...new Set(recentActivity.map((a: any) => a.studentId)),
    ];
    // Filter out invalid ObjectIds (like anonymous user IDs)
    const validActivityStudentIds = activityStudentIds.filter((id) => {
      return /^[0-9a-fA-F]{24}$/.test(id.toString());
    });
    const activityStudents = await User.find({
      _id: { $in: validActivityStudentIds },
    })
      .select("name")
      .lean();

    const recentActivityWithDetails = recentActivity.map((activity: any) => {
      const student = activityStudents.find(
        (s: any) => s._id.toString() === activity.studentId
      );
      return {
        id: activity._id.toString(),
        studentName: student?.name || "Unknown",
        query: activity.query,
        courseId: activity.courseId,
        createdAt: activity.createdAt,
        responseTime: activity.responseTime,
      };
    });

    // Get documents by course
    const documentsByCourse = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id } },
      {
        $group: {
          _id: "$courseId",
          count: { $sum: 1 },
          indexed: {
            $sum: { $cond: [{ $eq: ["$status", "indexed"] }, 1, 0] },
          },
          totalChunks: { $sum: "$chunkCount" },
        },
      },
    ]);

    // Get documents by file type
    const documentsByType = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id } },
      {
        $group: {
          _id: "$fileType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate total chunks indexed
    const totalChunks = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id, status: "indexed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$chunkCount" },
        },
      },
    ]);

    // Get query trends (last 7 days)
    const queryTrends = await QueryLog.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get engagement rate
    const engagementRate =
      totalStudents > 0
        ? Math.round((activeStudents.length / totalStudents) * 100)
        : 0;

    return NextResponse.json({
      stats: {
        totalDocuments,
        indexedDocuments,
        processingDocuments,
        failedDocuments,
        totalStudents,
        activeStudents: activeStudents.length,
        totalQueries,
        totalQueriesAllTime,
        avgResponseTime: avgResponseTime[0]?.avgTime
          ? Math.round(avgResponseTime[0].avgTime)
          : 0,
        totalChunks: totalChunks[0]?.total || 0,
        engagementRate,
      },
      recentDocuments,
      topStudents: topStudentsWithDetails,
      recentActivity: recentActivityWithDetails,
      documentsByCourse,
      documentsByType,
      queryTrends,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
