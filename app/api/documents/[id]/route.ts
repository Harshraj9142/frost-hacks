import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { deleteDocumentVectors } from "@/lib/vector-store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params in Next.js 15+
    const { id } = await params;

    await connectDB();

    const document = await DocumentModel.findOne({
      _id: id,
      facultyId: session.user.id,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete vectors from Pinecone
    if (document.status === "indexed") {
      await deleteDocumentVectors(document.fileName, document.courseId);
    }

    // Delete document from MongoDB
    await DocumentModel.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
