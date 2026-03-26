import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "#8b5cf6",
    },
    facultyId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for faculty + code uniqueness
CourseSchema.index({ facultyId: 1, code: 1 }, { unique: true });

const CourseModel = mongoose.models.Course || mongoose.model("Course", CourseSchema);

export default CourseModel;
