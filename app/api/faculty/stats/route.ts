import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get document stats
    const totalDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
    });

    const indexedDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "indexed",
    });

    const processingDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "processing",
    });

    const failedDocuments = await DocumentModel.countDocuments({
      facultyId: session.user.id,
      status: "failed",
    });

    // Get recent documents
    const recentDocuments = await DocumentModel.find({
      facultyId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get documents by course
    const documentsByCourse = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id } },
      {
        $group: {
          _id: "$courseId",
          count: { $sum: 1 },
          indexed: {
            $sum: { $cond: [{ $eq: ["$status", "indexed"] }, 1, 0] },
          },
        },
      },
    ]);

    return NextResponse.json({
      stats: {
        totalDocuments,
        indexedDocuments,
        processingDocuments,
        failedDocuments,
      },
      recentDocuments,
      documentsByCourse,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
