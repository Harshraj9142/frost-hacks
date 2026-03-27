import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StudentDocumentModel from "@/models/StudentDocument";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get only the student's own documents
    const documents = await StudentDocumentModel.find({ 
      studentId: session.user.id 
    })
      .sort({ uploadedAt: -1 })
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the document belongs to the student
    const document = await StudentDocumentModel.findOne({
      _id: documentId,
      studentId: session.user.id,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the document
    await StudentDocumentModel.findByIdAndDelete(documentId);

    // TODO: Also delete vectors from Pinecone if needed
    // This would require implementing vector deletion in vector-store.ts

    return NextResponse.json({ 
      message: "Document deleted successfully" 
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
