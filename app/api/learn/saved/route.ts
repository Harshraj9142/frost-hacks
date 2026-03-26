import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SavedContent from "@/models/SavedContent";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const type = searchParams.get("type");

    await connectDB();

    const query: any = { userId: session.user.id };
    if (courseId) query.courseId = courseId;
    if (type) query.type = type;

    const saved = await SavedContent.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedSaved = saved.map((item: any) => ({
      id: item._id.toString(),
      type: item.type,
      data: item.data,
      courseId: item.courseId,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      saved: formattedSaved,
    });
  } catch (error: any) {
    console.error("Get saved content error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get saved content" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await SavedContent.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Delete saved content error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete content" },
      { status: 500 }
    );
  }
}
