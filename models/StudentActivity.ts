import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentActivity extends Document {
  studentId: string;
  courseId: string;
  queryCount: number;
  lastActive: Date;
  documentsAccessed: string[];
  totalTimeSpent: number; // in minutes
  averageResponseTime: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const StudentActivitySchema: Schema<IStudentActivity> = new Schema(
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
    queryCount: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    documentsAccessed: {
      type: [String],
      default: [],
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
StudentActivitySchema.index({ studentId: 1, courseId: 1 }, { unique: true });
StudentActivitySchema.index({ lastActive: -1 });

const StudentActivity: Model<IStudentActivity> =
  mongoose.models.StudentActivity ||
  mongoose.model<IStudentActivity>("StudentActivity", StudentActivitySchema);

export default StudentActivity;
