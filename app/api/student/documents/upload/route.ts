import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StudentDocumentModel from "@/models/StudentDocument";
import { processDocument } from "@/lib/document-processor";
import { indexDocument } from "@/lib/vector-store";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized. Student access required." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "text/plain"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and TXT files are supported" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    await connectDB();

    // Create student document record
    const document = await StudentDocumentModel.create({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      studentId: session.user.id,
      status: "processing",
      isPrivate: true,
    });

    // Process file in background
    processFileAsync(
      file, 
      document._id.toString(), 
      session.user.id
    );

    return NextResponse.json(
      {
        message: "File uploaded successfully. Processing in background.",
        documentId: document._id,
        fileName: file.name,
        status: "processing",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

async function processFileAsync(
  file: File,
  documentId: string,
  studentId: string
) {
  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process document
    const processed = await processDocument(buffer, file.name, file.type);

    // Index in Pinecone with student-specific metadata
    const { vectorIds } = await indexDocument(processed.chunks, {
      fileName: file.name,
      fileType: file.type,
      studentId,
      isStudentDocument: true,
      documentId,
    });

    // Update document status
    await connectDB();
    await StudentDocumentModel.findByIdAndUpdate(documentId, {
      status: "indexed",
      vectorIds,
      chunkCount: processed.chunks.length,
      pageCount: processed.metadata.pageCount,
      indexedAt: new Date(),
    });

    console.log(`Student document ${file.name} indexed successfully`);
  } catch (error: any) {
    console.error("Processing error:", error);
    
    // Update document with error
    await connectDB();
    await StudentDocumentModel.findByIdAndUpdate(documentId, {
      status: "failed",
      error: error.message,
    });
  }
}
