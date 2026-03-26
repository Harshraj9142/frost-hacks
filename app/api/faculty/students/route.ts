import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import StudentActivity from "@/models/StudentActivity";
import QueryLog from "@/models/QueryLog";
import Course from "@/models/Course";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");

    await connectDB();

    // If requesting single student details
    if (studentId) {
      const student = await User.findById(studentId)
        .select("name email courses createdAt avatar role")
        .lean();

      if (!student) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      if (student.role !== "student") {
        return NextResponse.json(
          { error: "User is not a student" },
          { status: 400 }
        );
      }

      // Get activity data for all courses
      const activities = await StudentActivity.find({ studentId })
        .lean();

      // Get recent queries
      const recentQueries = await QueryLog.find({ studentId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Get course details
      const courseDetails = await Course.find({
        _id: { $in: student.courses || [] },
      }).lean();

      // Calculate overall stats
      const totalQueries = activities.reduce((sum, a) => sum + a.queryCount, 0);
      const totalTimeSpent = activities.reduce((sum, a) => sum + a.totalTimeSpent, 0);
      const avgResponseTime = activities.length > 0
        ? activities.reduce((sum, a) => sum + a.averageResponseTime, 0) / activities.length
        : 0;

      return NextResponse.json({
        student: {
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          joinedAt: student.createdAt,
          courses: courseDetails.map((c: any) => ({
            id: c._id.toString(),
            code: c.code,
            name: c.name,
            color: c.color,
          })),
        },
        stats: {
          totalQueries,
          totalTimeSpent,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100,
          coursesEnrolled: student.courses?.length || 0,
        },
        activities: activities.map((a: any) => ({
          courseId: a.courseId,
          queryCount: a.queryCount,
          lastActive: a.lastActive,
          documentsAccessed: a.documentsAccessed.length,
          timeSpent: a.totalTimeSpent,
        })),
        recentQueries: recentQueries.map((q: any) => ({
          id: q._id.toString(),
          query: q.query,
          courseId: q.courseId,
          createdAt: q.createdAt,
          responseTime: q.responseTime,
          satisfied: q.satisfied,
        })),
      });
    }

    // Build query for student list
    const query: any = { role: "student" };
    if (courseId) {
      query.courses = courseId;
    }

    // Fetch students
    const students = await User.find(query)
      .select("name email courses createdAt avatar")
      .sort({ createdAt: -1 })
      .lean();

    // Get activity data for all students
    const studentIds = students.map((s: any) => s._id.toString());
    const activities = await StudentActivity.find({
      studentId: { $in: studentIds },
    }).lean();

    // Create activity map
    const activityMap = new Map();
    activities.forEach((activity: any) => {
      const key = activity.studentId;
      if (!activityMap.has(key)) {
        activityMap.set(key, {
          totalQueries: 0,
          lastActive: activity.lastActive,
          totalTimeSpent: 0,
        });
      }
      const current = activityMap.get(key);
      current.totalQueries += activity.queryCount;
      current.totalTimeSpent += activity.totalTimeSpent;
      if (activity.lastActive > current.lastActive) {
        current.lastActive = activity.lastActive;
      }
    });

    // Format response with activity data
    const formattedStudents = students.map((student: any) => {
      const studentId = student._id.toString();
      const activity = activityMap.get(studentId) || {
        totalQueries: 0,
        lastActive: student.createdAt,
        totalTimeSpent: 0,
      };

      return {
        id: studentId,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        courses: student.courses || [],
        joinedAt: student.createdAt,
        queryCount: activity.totalQueries,
        lastActive: activity.lastActive,
        timeSpent: activity.totalTimeSpent,
      };
    });

    return NextResponse.json({
      students: formattedStudents,
      total: formattedStudents.length,
    });
  } catch (error: any) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}
