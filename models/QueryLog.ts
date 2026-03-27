import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQueryLog extends Document {
  studentId: string; // Now stores anonymous ID
  courseId: string;
  query: string; // PII removed
  response: string; // PII removed
  documentsUsed: string[];
  responseTime: number; // in milliseconds
  satisfied: boolean | null;
  privacyMetadata?: {
    piiRemoved: boolean;
    piiTypes: string[];
    isEncrypted: boolean;
    privacyScore: number;
  };
  createdAt: Date;
}

const QueryLogSchema: Schema<IQueryLog> = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
      comment: "Anonymous student ID (not real user ID)",
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      comment: "Query with PII removed",
    },
    response: {
      type: String,
      required: true,
      comment: "Response with PII removed",
    },
    documentsUsed: {
      type: [String],
      default: [],
    },
    responseTime: {
      type: Number,
      required: true,
    },
    satisfied: {
      type: Boolean,
      default: null,
    },
    privacyMetadata: {
      type: {
        piiRemoved: Boolean,
        piiTypes: [String],
        isEncrypted: Boolean,
        privacyScore: Number,
      },
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
QueryLogSchema.index({ studentId: 1, createdAt: -1 });
QueryLogSchema.index({ courseId: 1, createdAt: -1 });
QueryLogSchema.index({ 'privacyMetadata.privacyScore': 1 });

const QueryLog: Model<IQueryLog> =
  mongoose.models.QueryLog || mongoose.model<IQueryLog>("QueryLog", QueryLogSchema);

export default QueryLog;
