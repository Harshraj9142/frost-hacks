import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISavedContent extends Document {
  userId: string;
  courseId: string;
  type: string;
  data: any;
  createdAt: Date;
}

const SavedContentSchema: Schema<ISavedContent> = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["flashcards", "quiz", "summary", "studyplan", "practice", "explanation"],
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
SavedContentSchema.index({ userId: 1, courseId: 1, type: 1 });

const SavedContent: Model<ISavedContent> =
  mongoose.models.SavedContent ||
  mongoose.model<ISavedContent>("SavedContent", SavedContentSchema);

export default SavedContent;
