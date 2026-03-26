import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import CourseModel from "@/models/Course";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    await connectDB();

    // For now, get all active courses (since Course model doesn't have students field yet)
    // TODO: Add students field to Course model for proper enrollment tracking
    const courses = await CourseModel.find({
      isActive: true,
    }).select("_id");

    const courseIds = courses.map((c) => c._id.toString());

    if (courseIds.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // Build query based on whether specific course is requested
    let query: any = {
      courseId: { $in: courseIds },
      status: { $in: ["indexed", "processing", "failed"] },
    };

    if (courseId) {
      query.courseId = courseId;
    }

    // Students can view all documents for active courses
    const documents = await DocumentModel.find(query)
      .sort({ uploadedAt: -1 })
      .select("-vectorIds") // Don't expose vector IDs to students
      .lean();

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error("Error fetching student documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
