import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "faculty") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const timeRange = searchParams.get("timeRange") || "7d"; // 7d, 30d, 90d

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Calculate date range
    const now = new Date();
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[timeRange] || 7;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Create QueryLog collection if it doesn't exist
    const QueryLog = mongoose.models.QueryLog || mongoose.model("QueryLog", new mongoose.Schema({
      courseId: String,
      studentId: String,
      studentName: String,
      question: String,
      response: String,
      isOutOfScope: Boolean,
      lowRelevance: Boolean,
      bestScore: Number,
      sourcesCount: Number,
      responseTime: Number,
      topics: [String],
      difficulty: String,
      tutorMode: String,
      timestamp: { type: Date, default: Date.now },
    }));

    // Fetch query logs
    const queryLogs = await QueryLog.find({
      courseId,
      timestamp: { $gte: startDate },
    }).sort({ timestamp: -1 });

    // 1. Topic-wise Analysis
    const topicAnalysis = analyzeTopics(queryLogs);

    // 2. Weak Concepts Identification
    const weakConcepts = identifyWeakConcepts(queryLogs);

    // 3. Topic Clustering
    const topicClusters = clusterTopics(queryLogs);

    // 4. Student-wise Tracking
    const studentTracking = trackStudents(queryLogs);

    // 5. Overall Statistics
    const overallStats = calculateOverallStats(queryLogs);

    // 6. Time-series Data
    const timeSeriesData = generateTimeSeries(queryLogs, days);

    return NextResponse.json({
      topicAnalysis,
      weakConcepts,
      topicClusters,
      studentTracking,
      overallStats,
      timeSeriesData,
      timeRange,
      totalQueries: queryLogs.length,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message },
      { status: 500 }
    );
  }
}

// Analyze topics from queries
function analyzeTopics(logs: any[]) {
  const topicMap = new Map<string, {
    count: number;
    avgScore: number;
    outOfScopeCount: number;
    lowRelevanceCount: number;
    avgResponseTime: number;
    scores: number[];
  }>();

  logs.forEach(log => {
    const topics = extractTopics(log.question);
    topics.forEach(topic => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          count: 0,
          avgScore: 0,
          outOfScopeCount: 0,
          lowRelevanceCount: 0,
          avgResponseTime: 0,
          scores: [],
        });
      }

      const data = topicMap.get(topic)!;
      data.count++;
      data.scores.push(log.bestScore || 0);
      if (log.isOutOfScope) data.outOfScopeCount++;
      if (log.lowRelevance) data.lowRelevanceCount++;
      data.avgResponseTime += log.responseTime || 0;
    });
  });

  // Calculate averages
  const topics = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    count: data.count,
    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
    outOfScopeRate: (data.outOfScopeCount / data.count) * 100,
    lowRelevanceRate: (data.lowRelevanceCount / data.count) * 100,
    avgResponseTime: data.avgResponseTime / data.count,
    confusionLevel: calculateConfusionLevel(data),
  }));

  return topics.sort((a, b) => b.count - a.count);
}

// Identify weak concepts
function identifyWeakConcepts(logs: any[]) {
  const conceptMap = new Map<string, {
    attempts: number;
    lowScores: number;
    outOfScope: number;
    avgScore: number;
    scores: number[];
  }>();

  logs.forEach(log => {
    const concepts = extractConcepts(log.question);
    concepts.forEach(concept => {
      if (!conceptMap.has(concept)) {
        conceptMap.set(concept, {
          attempts: 0,
          lowScores: 0,
          outOfScope: 0,
          avgScore: 0,
          scores: [],
        });
      }

      const data = conceptMap.get(concept)!;
      data.attempts++;
      data.scores.push(log.bestScore || 0);
      if (log.bestScore < 0.60) data.lowScores++;
      if (log.isOutOfScope) data.outOfScope++;
    });
  });

  // Calculate weakness score
  const concepts = Array.from(conceptMap.entries()).map(([concept, data]) => {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const lowScoreRate = (data.lowScores / data.attempts) * 100;
    const outOfScopeRate = (data.outOfScope / data.attempts) * 100;
    
    // Weakness score: higher = weaker concept
    const weaknessScore = (lowScoreRate * 0.5) + (outOfScopeRate * 0.3) + ((1 - avgScore) * 100 * 0.2);

    return {
      concept,
      attempts: data.attempts,
      avgScore,
      lowScoreRate,
      outOfScopeRate,
      weaknessScore,
      severity: weaknessScore > 50 ? 'high' : weaknessScore > 30 ? 'medium' : 'low',
    };
  });

  return concepts
    .filter(c => c.attempts >= 3) // Only concepts with 3+ attempts
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 20); // Top 20 weak concepts
}

// Cluster topics
function clusterTopics(logs: any[]) {
  const clusters = {
    algorithms: { topics: [], count: 0, avgScore: 0 },
    dataStructures: { topics: [], count: 0, avgScore: 0 },
    complexity: { topics: [], count: 0, avgScore: 0 },
    implementation: { topics: [], count: 0, avgScore: 0 },
    theory: { topics: [], count: 0, avgScore: 0 },
    other: { topics: [], count: 0, avgScore: 0 },
  };

  const clusterKeywords: Record<string, string[]> = {
    algorithms: ['sort', 'search', 'algorithm', 'quicksort', 'mergesort', 'binary search'],
    dataStructures: ['array', 'list', 'tree', 'graph', 'stack', 'queue', 'heap', 'hash'],
    complexity: ['big o', 'time complexity', 'space complexity', 'o(n)', 'efficiency'],
    implementation: ['implement', 'code', 'write', 'create', 'build', 'steps'],
    theory: ['explain', 'what is', 'define', 'describe', 'why', 'how does'],
  };

  logs.forEach(log => {
    const question = log.question.toLowerCase();
    let assigned = false;

    for (const [cluster, keywords] of Object.entries(clusterKeywords)) {
      if (keywords.some(kw => question.includes(kw))) {
        (clusters as any)[cluster].count++;
        (clusters as any)[cluster].avgScore += log.bestScore || 0;
        if (!(clusters as any)[cluster].topics.includes(log.question)) {
          (clusters as any)[cluster].topics.push(log.question);
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.other.count++;
      clusters.other.avgScore += log.bestScore || 0;
      clusters.other.topics.push(log.question);
    }
  });

  // Calculate averages
  Object.keys(clusters).forEach(key => {
    const cluster = (clusters as any)[key];
    if (cluster.count > 0) {
      cluster.avgScore = cluster.avgScore / cluster.count;
      cluster.topics = cluster.topics.slice(0, 5); // Top 5 topics per cluster
    }
  });

  return clusters;
}

// Track student queries
function trackStudents(logs: any[]) {
  const studentMap = new Map<string, {
    name: string;
    queryCount: number;
    avgScore: number;
    outOfScopeCount: number;
    topics: Set<string>;
    lastQuery: Date;
    scores: number[];
    weakTopics: string[];
  }>();

  logs.forEach(log => {
    if (!log.studentId) return;

    if (!studentMap.has(log.studentId)) {
      studentMap.set(log.studentId, {
        name: log.studentName || 'Unknown',
        queryCount: 0,
        avgScore: 0,
        outOfScopeCount: 0,
        topics: new Set(),
        lastQuery: log.timestamp,
        scores: [],
        weakTopics: [],
      });
    }

    const data = studentMap.get(log.studentId)!;
    data.queryCount++;
    data.scores.push(log.bestScore || 0);
    if (log.isOutOfScope) data.outOfScopeCount++;
    
    const topics = extractTopics(log.question);
    topics.forEach(t => data.topics.add(t));
    
    if (log.timestamp > data.lastQuery) {
      data.lastQuery = log.timestamp;
    }

    // Track weak topics (low scores)
    if (log.bestScore < 0.60) {
      topics.forEach(t => {
        if (!data.weakTopics.includes(t)) {
          data.weakTopics.push(t);
        }
      });
    }
  });

  // Calculate averages and format
  const students = Array.from(studentMap.entries()).map(([id, data]) => ({
    studentId: id,
    studentName: data.name,
    queryCount: data.queryCount,
    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
    outOfScopeRate: (data.outOfScopeCount / data.queryCount) * 100,
    topicsExplored: data.topics.size,
    weakTopics: data.weakTopics.slice(0, 5),
    lastQuery: data.lastQuery,
    engagement: calculateEngagement(data),
  }));

  return students.sort((a, b) => b.queryCount - a.queryCount);
}

// Calculate overall statistics
function calculateOverallStats(logs: any[]) {
  const total = logs.length;
  const inScope = logs.filter(l => !l.isOutOfScope).length;
  const outOfScope = logs.filter(l => l.isOutOfScope).length;
  const lowRelevance = logs.filter(l => l.lowRelevance).length;

  const scores = logs.map(l => l.bestScore || 0).filter(s => s > 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const responseTimes = logs.map(l => l.responseTime || 0).filter(t => t > 0);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  return {
    totalQueries: total,
    inScopeQueries: inScope,
    outOfScopeQueries: outOfScope,
    lowRelevanceQueries: lowRelevance,
    inScopeRate: (inScope / total) * 100,
    outOfScopeRate: (outOfScope / total) * 100,
    avgScore,
    avgResponseTime,
    uniqueStudents: new Set(logs.map(l => l.studentId)).size,
    uniqueTopics: new Set(logs.flatMap(l => extractTopics(l.question))).size,
  };
}

// Generate time series data
function generateTimeSeries(logs: any[], days: number) {
  const series: any[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayLogs = logs.filter(l => {
      const logDate = new Date(l.timestamp);
      return logDate >= dayStart && logDate <= dayEnd;
    });

    series.push({
      date: dayStart.toISOString().split('T')[0],
      queries: dayLogs.length,
      inScope: dayLogs.filter(l => !l.isOutOfScope).length,
      outOfScope: dayLogs.filter(l => l.isOutOfScope).length,
      avgScore: dayLogs.length > 0
        ? dayLogs.reduce((sum, l) => sum + (l.bestScore || 0), 0) / dayLogs.length
        : 0,
    });
  }

  return series;
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

function extractConcepts(question: string): string[] {
  return extractTopics(question); // Same as topics for now
}

function calculateConfusionLevel(data: any): number {
  // Higher confusion = more out of scope + low relevance + low scores
  const outOfScopeWeight = (data.outOfScopeCount / data.count) * 40;
  const lowRelevanceWeight = (data.lowRelevanceCount / data.count) * 30;
  const avgScore = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length;
  const scoreWeight = (1 - avgScore) * 30;

  return outOfScopeWeight + lowRelevanceWeight + scoreWeight;
}

function calculateEngagement(data: any): string {
  const queriesPerDay = data.queryCount / 7; // Assuming 7-day window
  const scoreQuality = data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length;

  if (queriesPerDay > 5 && scoreQuality > 0.70) return 'high';
  if (queriesPerDay > 2 && scoreQuality > 0.50) return 'medium';
  return 'low';
}
