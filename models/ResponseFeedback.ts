import mongoose, { Schema, Document, Model } from "mongoose";

export interface IResponseFeedback extends Document {
  queryLogId: string; // Reference to QueryLog
  studentId: string; // Anonymous student ID
  courseId: string;
  
  // Rating
  rating: 'helpful' | 'not_helpful' | 'very_helpful';
  
  // Detailed feedback categories
  feedbackCategories?: {
    accuracy: number; // 1-5
    clarity: number; // 1-5
    completeness: number; // 1-5
    relevance: number; // 1-5
    citations: number; // 1-5
  };
  
  // Specific issues (if not helpful)
  issues?: string[]; // ['incorrect_info', 'missing_context', 'poor_citations', 'off_topic', 'too_complex', 'too_simple']
  
  // Free-form feedback
  comment?: string;
  
  // Context
  tutorMode: 'direct' | 'guided';
  hadMultipleDocuments: boolean;
  documentCount: number;
  responseLength: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const ResponseFeedbackSchema: Schema<IResponseFeedback> = new Schema(
  {
    queryLogId: {
      type: String,
      required: true,
      index: true,
      ref: 'QueryLog',
    },
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
    rating: {
      type: String,
      enum: ['helpful', 'not_helpful', 'very_helpful'],
      required: true,
    },
    feedbackCategories: {
      type: {
        accuracy: { type: Number, min: 1, max: 5 },
        clarity: { type: Number, min: 1, max: 5 },
        completeness: { type: Number, min: 1, max: 5 },
        relevance: { type: Number, min: 1, max: 5 },
        citations: { type: Number, min: 1, max: 5 },
      },
      required: false,
    },
    issues: {
      type: [String],
      enum: [
        'incorrect_info',
        'missing_context',
        'poor_citations',
        'off_topic',
        'too_complex',
        'too_simple',
        'unhelpful_socratic',
        'needs_direct_answer',
        'missing_examples',
        'confusing_explanation',
      ],
      default: [],
    },
    comment: {
      type: String,
      maxlength: 1000,
      required: false,
    },
    tutorMode: {
      type: String,
      enum: ['direct', 'guided'],
      required: true,
    },
    hadMultipleDocuments: {
      type: Boolean,
      default: false,
    },
    documentCount: {
      type: Number,
      default: 1,
    },
    responseLength: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for analytics
ResponseFeedbackSchema.index({ courseId: 1, rating: 1 });
ResponseFeedbackSchema.index({ tutorMode: 1, rating: 1 });
ResponseFeedbackSchema.index({ createdAt: -1 });
ResponseFeedbackSchema.index({ studentId: 1, createdAt: -1 });

// Compound index for analytics queries
ResponseFeedbackSchema.index({ courseId: 1, tutorMode: 1, rating: 1 });

const ResponseFeedback: Model<IResponseFeedback> =
  mongoose.models.ResponseFeedback || 
  mongoose.model<IResponseFeedback>("ResponseFeedback", ResponseFeedbackSchema);

export default ResponseFeedback;
