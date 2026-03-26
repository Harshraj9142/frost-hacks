import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import User from "@/models/User";

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

    // Get total students
    const totalStudents = await User.countDocuments({
      role: "student",
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
          totalChunks: { $sum: "$chunkCount" },
        },
      },
    ]);

    // Get documents by file type
    const documentsByType = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id } },
      {
        $group: {
          _id: "$fileType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate total chunks indexed
    const totalChunks = await DocumentModel.aggregate([
      { $match: { facultyId: session.user.id, status: "indexed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$chunkCount" },
        },
      },
    ]);

    return NextResponse.json({
      stats: {
        totalDocuments,
        indexedDocuments,
        processingDocuments,
        failedDocuments,
        totalStudents,
        totalChunks: totalChunks[0]?.total || 0,
      },
      recentDocuments,
      documentsByCourse,
      documentsByType,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
