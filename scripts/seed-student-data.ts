/**
 * Seed script to populate student activity data for testing
 * Run with: npx tsx scripts/seed-student-data.ts
 */

import mongoose from "mongoose";
import StudentActivity from "../models/StudentActivity";
import QueryLog from "../models/QueryLog";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/eduai";

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Sample student IDs (replace with actual IDs from your database)
    const sampleStudents = [
      { id: "student1", courses: ["course1", "course2"] },
      { id: "student2", courses: ["course1"] },
      { id: "student3", courses: ["course2", "course3"] },
    ];

    // Clear existing data
    await StudentActivity.deleteMany({});
    await QueryLog.deleteMany({});
    console.log("Cleared existing data");

    // Seed student activities
    for (const student of sampleStudents) {
      for (const courseId of student.courses) {
        const queryCount = Math.floor(Math.random() * 150) + 10;
        const timeSpent = Math.floor(Math.random() * 300) + 30;
        
        await StudentActivity.create({
          studentId: student.id,
          courseId,
          queryCount,
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          documentsAccessed: [`doc1`, `doc2`, `doc3`],
          totalTimeSpent: timeSpent,
          averageResponseTime: Math.random() * 3 + 0.5,
        });

        // Create sample queries
        for (let i = 0; i < Math.min(queryCount, 15); i++) {
          await QueryLog.create({
            studentId: student.id,
            courseId,
            query: `Sample query ${i + 1} about the course material`,
            response: `Sample response for query ${i + 1}`,
            documentsUsed: [`doc1`, `doc2`],
            responseTime: Math.floor(Math.random() * 2000) + 500,
            satisfied: Math.random() > 0.3 ? true : Math.random() > 0.5 ? false : null,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    console.log("✅ Sample data seeded successfully");
    console.log(`Created activities for ${sampleStudents.length} students`);
    
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seedData();
