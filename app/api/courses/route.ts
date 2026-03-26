import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import CourseModel from "@/models/Course";
import DocumentModel from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get all active courses
    const courses = await CourseModel.find({ isActive: true })
      .select("code name color facultyId")
      .lean();

    // Get document counts for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const documentCount = await DocumentModel.countDocuments({
          courseId: course._id.toString(),
          status: "indexed",
        });

        // Get instructor name
        const instructor = "Faculty"; // You can fetch from User model if needed

        return {
          id: course._id.toString(),
          code: course.code,
          name: course.name,
          color: course.color,
          instructor,
          studentCount: 0, // Can be calculated from User model
          documentCount,
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
