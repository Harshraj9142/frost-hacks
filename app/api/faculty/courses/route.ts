import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";
import CourseModel from "@/models/Course";

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

    // Get courses from database
    const courses = await CourseModel.find({
      facultyId: session.user.id,
      isActive: true,
    }).lean();

    // Get statistics for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        // Count students enrolled in this course
        const studentCount = await User.countDocuments({
          role: "student",
          courses: course._id.toString(),
        });

        // Count documents for this course
        const documentCount = await DocumentModel.countDocuments({
          courseId: course._id.toString(),
          facultyId: session.user.id,
        });

        // Count indexed documents
        const indexedCount = await DocumentModel.countDocuments({
          courseId: course._id.toString(),
          facultyId: session.user.id,
          status: "indexed",
        });

        // Get total chunks
        const chunkStats = await DocumentModel.aggregate([
          {
            $match: {
              courseId: course._id.toString(),
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
          id: course._id.toString(),
          code: course.code,
          name: course.name,
          color: course.color,
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { code, name, color } = await req.json();

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if course code already exists for this faculty
    const existing = await CourseModel.findOne({
      facultyId: session.user.id,
      code: code.trim(),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A course with this code already exists" },
        { status: 409 }
      );
    }

    // Create new course
    const course = await CourseModel.create({
      code: code.trim(),
      name: name.trim(),
      color: color || "#8b5cf6",
      facultyId: session.user.id,
    });

    return NextResponse.json({
      course: {
        id: course._id.toString(),
        code: course.code,
        name: course.name,
        color: course.color,
        studentCount: 0,
        documentCount: 0,
        indexedCount: 0,
        totalChunks: 0,
        instructor: session.user.name || "Faculty",
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
