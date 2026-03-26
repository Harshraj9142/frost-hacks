import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";

export async function GET(req: NextRequest) {
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

    return NextResponse.json({
      stats: {
        enrolledCourses: enrolledCourses.length,
        availableDocuments,
        totalChunks,
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
