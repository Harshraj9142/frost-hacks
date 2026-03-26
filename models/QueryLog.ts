import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQueryLog extends Document {
  studentId: string;
  courseId: string;
  query: string;
  response: string;
  documentsUsed: string[];
  responseTime: number; // in milliseconds
  satisfied: boolean | null;
  createdAt: Date;
}

const QueryLogSchema: Schema<IQueryLog> = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
QueryLogSchema.index({ studentId: 1, createdAt: -1 });
QueryLogSchema.index({ courseId: 1, createdAt: -1 });

const QueryLog: Model<IQueryLog> =
  mongoose.models.QueryLog || mongoose.model<IQueryLog>("QueryLog", QueryLogSchema);

export default QueryLog;
