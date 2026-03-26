import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Students can view all indexed documents for their enrolled courses
    const documents = await DocumentModel.find({
      courseId,
      status: { $in: ["indexed", "processing", "failed"] }, // Show all statuses
    })
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
