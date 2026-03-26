import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SavedContent from "@/models/SavedContent";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data, courseId } = await req.json();

    if (!type || !data || !courseId) {
      return NextResponse.json(
        { error: "Type, data, and courseId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const savedContent = await SavedContent.create({
      userId: session.user.id,
      courseId,
      type,
      data,
    });

    return NextResponse.json({
      success: true,
      id: savedContent._id.toString(),
    });
  } catch (error: any) {
    console.error("Save content error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save content" },
      { status: 500 }
    );
  }
}
