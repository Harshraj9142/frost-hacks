import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentDocument extends Document {
  fileName: string;
  fileType: string;
  fileSize: number;
  studentId: string;
  vectorIds: string[];
  status: "processing" | "indexed" | "failed";
  chunkCount: number;
  pageCount?: number;
  uploadedAt: Date;
  indexedAt?: Date;
  error?: string;
  isPrivate: boolean; // Only accessible by the student who uploaded it
}

const StudentDocumentSchema: Schema<IStudentDocument> = new Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    vectorIds: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["processing", "indexed", "failed"],
      default: "processing",
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    pageCount: {
      type: Number,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    indexedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
StudentDocumentSchema.index({ studentId: 1, uploadedAt: -1 });
StudentDocumentSchema.index({ status: 1, uploadedAt: -1 });

const StudentDocumentModel: Model<IStudentDocument> =
  mongoose.models.StudentDocument || 
  mongoose.model<IStudentDocument>("StudentDocument", StudentDocumentSchema);

export default StudentDocumentModel;
