import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    await connectDB();

    // Build query
    const query: any = { role: "student" };
    if (courseId) {
      query.courses = courseId;
    }

    // Fetch students
    const students = await User.find(query)
      .select("name email courses createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Format response
    const formattedStudents = students.map((student: any) => ({
      id: student._id.toString(),
      name: student.name,
      email: student.email,
      courses: student.courses || [],
      joinedAt: student.createdAt,
    }));

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
