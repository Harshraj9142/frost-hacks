import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get all courses from the store (these are predefined)
    // In a real app, you'd fetch from a Course model
    const courses = [
      { id: "cs101", code: "CS 101", name: "Introduction to Computer Science", color: "#3b82f6" },
      { id: "math201", code: "MATH 201", name: "Calculus II", color: "#8b5cf6" },
      { id: "ml301", code: "ML 301", name: "Machine Learning Fundamentals", color: "#ec4899" },
    ];

    // Get statistics for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Count students enrolled in this course
        const studentCount = await User.countDocuments({
          role: "student",
          courses: course.id,
        });

        // Count documents for this course
        const documentCount = await DocumentModel.countDocuments({
          courseId: course.id,
          facultyId: session.user.id,
        });

        // Count indexed documents
        const indexedCount = await DocumentModel.countDocuments({
          courseId: course.id,
          facultyId: session.user.id,
          status: "indexed",
        });

        // Get total chunks
        const chunkStats = await DocumentModel.aggregate([
          {
            $match: {
              courseId: course.id,
              facultyId: session.user.id,
              status: "indexed",
            },
          },
          {
            $group: {
              _id: null,
              totalChunks: { $sum: "$chunkCount" },
            },
          },
        ]);

        return {
          ...course,
          studentCount,
          documentCount,
          indexedCount,
          totalChunks: chunkStats[0]?.totalChunks || 0,
          instructor: session.user.name || "Faculty",
        };
      })
    );

    return NextResponse.json({
      courses: coursesWithStats,
    });
  } catch (error: any) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
