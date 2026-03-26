import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import CourseModel from "@/models/Course";
import DocumentModel from "@/models/Document";
import { deleteDocumentVectors } from "@/lib/vector-store";

export async function PUT(
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

    const { id } = await params;
    const { code, name, color } = await req.json();

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find course and verify ownership
    const course = await CourseModel.findOne({
      _id: id,
      facultyId: session.user.id,
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if new code conflicts with another course
    if (code !== course.code) {
      const existing = await CourseModel.findOne({
        facultyId: session.user.id,
        code: code.trim(),
        _id: { $ne: id },
      });

      if (existing) {
        return NextResponse.json(
          { error: "A course with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Update course
    course.code = code.trim();
    course.name = name.trim();
    course.color = color || course.color;
    await course.save();

    // Get updated stats
    const documentCount = await DocumentModel.countDocuments({
      courseId: id,
      facultyId: session.user.id,
    });

    const indexedCount = await DocumentModel.countDocuments({
      courseId: id,
      facultyId: session.user.id,
      status: "indexed",
    });

    return NextResponse.json({
      course: {
        id: course._id.toString(),
        code: course.code,
        name: course.name,
        color: course.color,
        studentCount: 0,
        documentCount,
        indexedCount,
        totalChunks: 0,
        instructor: session.user.name || "Faculty",
      },
    });
  } catch (error: any) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

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

    const { id } = await params;

    await connectDB();

    // Find course and verify ownership
    const course = await CourseModel.findOne({
      _id: id,
      facultyId: session.user.id,
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get all documents for this course
    const documents = await DocumentModel.find({
      courseId: id,
      facultyId: session.user.id,
    });

    // Delete vectors from Pinecone for each document
    for (const doc of documents) {
      if (doc.status === "indexed" && doc.vectorIds && doc.vectorIds.length > 0) {
        try {
          await deleteDocumentVectors(doc.fileName, id);
        } catch (error) {
          console.error(`Failed to delete vectors for ${doc.fileName}:`, error);
          // Continue with deletion even if vector deletion fails
        }
      }
    }

    // Delete all documents for this course
    await DocumentModel.deleteMany({
      courseId: id,
      facultyId: session.user.id,
    });

    // Soft delete the course (mark as inactive)
    course.isActive = false;
    await course.save();

    return NextResponse.json({
      message: "Course deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
