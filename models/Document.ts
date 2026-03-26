import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocument extends Document {
  fileName: string;
  fileType: string;
  fileSize: number;
  courseId: string;
  facultyId: string;
  vectorIds: string[];
  status: "processing" | "indexed" | "failed";
  chunkCount: number;
  pageCount?: number;
  uploadedAt: Date;
  indexedAt?: Date;
  error?: string;
}

const DocumentSchema: Schema<IDocument> = new Schema(
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
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    facultyId: {
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
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
DocumentSchema.index({ courseId: 1, facultyId: 1 });
DocumentSchema.index({ status: 1, uploadedAt: -1 });

const DocumentModel: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
