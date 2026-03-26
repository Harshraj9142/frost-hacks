import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

// Query Log Schema
const QueryLogSchema = new mongoose.Schema({
  courseId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: String,
  question: { type: String, required: true },
  response: String,
  isOutOfScope: { type: Boolean, default: false },
  lowRelevance: { type: Boolean, default: false },
  bestScore: Number,
  sourcesCount: Number,
  responseTime: Number,
  topics: [String],
  difficulty: String,
  tutorMode: String,
  timestamp: { type: Date, default: Date.now, index: true },
});

const QueryLog = mongoose.models.QueryLog || mongoose.model("QueryLog", QueryLogSchema);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseId,
      question,
      response,
      isOutOfScope,
      lowRelevance,
      bestScore,
      sourcesCount,
      responseTime,
      tutorMode,
    } = body;

    if (!courseId || !question) {
      return NextResponse.json(
        { error: "Course ID and question are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Extract topics from question
    const topics = extractTopics(question);

    // Determine difficulty based on question complexity
    const difficulty = determineDifficulty(question);

    // Create log entry
    const logEntry = await QueryLog.create({
      courseId,
      studentId: session.user.id,
      studentName: session.user.name,
      question,
      response,
      isOutOfScope: isOutOfScope || false,
      lowRelevance: lowRelevance || false,
      bestScore: bestScore || 0,
      sourcesCount: sourcesCount || 0,
      responseTime: responseTime || 0,
      topics,
      difficulty,
      tutorMode: tutorMode || 'direct',
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      logId: logEntry._id,
    });
  } catch (error: any) {
    console.error("Query log error:", error);
    return NextResponse.json(
      { error: "Failed to log query", details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function extractTopics(question: string): string[] {
  const q = question.toLowerCase();
  const topics: string[] = [];

  const topicKeywords: Record<string, string[]> = {
    'Binary Search': ['binary search'],
    'Quicksort': ['quicksort', 'quick sort'],
    'Merge Sort': ['merge sort', 'mergesort'],
    'Linked List': ['linked list'],
    'Binary Tree': ['binary tree'],
    'Hash Table': ['hash table', 'hash map'],
    'Stack': ['stack'],
    'Queue': ['queue'],
    'Graph': ['graph', 'bfs', 'dfs'],
    'Big O': ['big o', 'time complexity', 'space complexity'],
    'Recursion': ['recursion', 'recursive'],
    'Sorting': ['sort', 'sorting'],
    'Searching': ['search', 'searching'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => q.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ['General'];
}

function determineDifficulty(question: string): string {
  const q = question.toLowerCase();
  
  // Easy: "what is", "define"
  if (q.startsWith('what is') || q.startsWith('define')) {
    return 'easy';
  }
  
  // Medium: "how", "explain", "compare"
  if (q.includes('how') || q.includes('explain') || q.includes('compare')) {
    return 'medium';
  }
  
  // Hard: "why", "analyze", "implement", "optimize"
  if (q.includes('why') || q.includes('analyze') || q.includes('implement') || q.includes('optimize')) {
    return 'hard';
  }
  
  return 'medium';
}
