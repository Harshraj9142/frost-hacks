import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";

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

    // Fetch query logs
    const queryLogs = await QueryLog.find({
      courseId,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: -1 });

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
      courseId,
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
    avgResponseTime: number;
    satisfactionRate: number;
    satisfiedCount: number;
    totalSatisfied: number;
  }>();

  logs.forEach(log => {
    const topics = extractTopics(log.query);
    topics.forEach(topic => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          count: 0,
          avgResponseTime: 0,
          satisfactionRate: 0,
          satisfiedCount: 0,
          totalSatisfied: 0,
        });
      }

      const data = topicMap.get(topic)!;
      data.count++;
      data.avgResponseTime += log.responseTime || 0;
      if (log.satisfied === true) {
        data.satisfiedCount++;
        data.totalSatisfied++;
      }
    });
  });

  // Calculate averages
  const topics = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    count: data.count,
    avgResponseTime: data.avgResponseTime / data.count,
    satisfactionRate: (data.satisfiedCount / data.count) * 100,
    confusionLevel: calculateConfusionLevel(data),
    outOfScopeRate: 0, // Not available in current schema
    lowRelevanceRate: 0, // Not available in current schema
    avgScore: data.satisfactionRate / 100, // Use satisfaction as proxy
  }));

  return topics.sort((a, b) => b.count - a.count);
}

// Identify weak concepts
function identifyWeakConcepts(logs: any[]) {
  const conceptMap = new Map<string, {
    attempts: number;
    unsatisfiedCount: number;
    avgResponseTime: number;
    responseTimes: number[];
  }>();

  logs.forEach(log => {
    const concepts = extractConcepts(log.query);
    concepts.forEach(concept => {
      if (!conceptMap.has(concept)) {
        conceptMap.set(concept, {
          attempts: 0,
          unsatisfiedCount: 0,
          avgResponseTime: 0,
          responseTimes: [],
        });
      }

      const data = conceptMap.get(concept)!;
      data.attempts++;
      data.responseTimes.push(log.responseTime || 0);
      if (log.satisfied === false) data.unsatisfiedCount++;
    });
  });

  // Calculate weakness score
  const concepts = Array.from(conceptMap.entries()).map(([concept, data]) => {
    const avgResponseTime = data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length;
    const unsatisfiedRate = (data.unsatisfiedCount / data.attempts) * 100;
    const satisfactionRate = 100 - unsatisfiedRate;
    
    // Weakness score: higher = weaker concept
    const weaknessScore = (unsatisfiedRate * 0.7) + ((avgResponseTime / 10000) * 30); // Normalize response time

    return {
      concept,
      attempts: data.attempts,
      avgScore: satisfactionRate / 100,
      lowScoreRate: unsatisfiedRate,
      outOfScopeRate: 0, // Not available
      weaknessScore: Math.min(weaknessScore, 100),
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
    algorithms: { topics: [], count: 0, avgSatisfaction: 0 },
    dataStructures: { topics: [], count: 0, avgSatisfaction: 0 },
    complexity: { topics: [], count: 0, avgSatisfaction: 0 },
    implementation: { topics: [], count: 0, avgSatisfaction: 0 },
    theory: { topics: [], count: 0, avgSatisfaction: 0 },
    other: { topics: [], count: 0, avgSatisfaction: 0 },
  };

  const clusterKeywords: Record<string, string[]> = {
    algorithms: ['sort', 'search', 'algorithm', 'quicksort', 'mergesort', 'binary search'],
    dataStructures: ['array', 'list', 'tree', 'graph', 'stack', 'queue', 'heap', 'hash'],
    complexity: ['big o', 'time complexity', 'space complexity', 'o(n)', 'efficiency'],
    implementation: ['implement', 'code', 'write', 'create', 'build', 'steps'],
    theory: ['explain', 'what is', 'define', 'describe', 'why', 'how does'],
  };

  logs.forEach(log => {
    const question = log.query.toLowerCase();
    let assigned = false;

    for (const [cluster, keywords] of Object.entries(clusterKeywords)) {
      if (keywords.some(kw => question.includes(kw))) {
        (clusters as any)[cluster].count++;
        (clusters as any)[cluster].avgSatisfaction += log.satisfied === true ? 1 : 0;
        if (!(clusters as any)[cluster].topics.includes(log.query)) {
          (clusters as any)[cluster].topics.push(log.query);
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.other.count++;
      clusters.other.avgSatisfaction += log.satisfied === true ? 1 : 0;
      clusters.other.topics.push(log.query);
    }
  });

  // Calculate averages
  Object.keys(clusters).forEach(key => {
    const cluster = (clusters as any)[key];
    if (cluster.count > 0) {
      cluster.avgScore = cluster.avgSatisfaction / cluster.count;
      cluster.topics = cluster.topics.slice(0, 5); // Top 5 topics per cluster
    }
  });

  return clusters;
}

// Track student queries
function trackStudents(logs: any[]) {
  const studentMap = new Map<string, {
    queryCount: number;
    satisfiedCount: number;
    topics: Set<string>;
    lastQuery: Date;
    weakTopics: string[];
  }>();

  logs.forEach(log => {
    if (!log.studentId) return;

    if (!studentMap.has(log.studentId)) {
      studentMap.set(log.studentId, {
        queryCount: 0,
        satisfiedCount: 0,
        topics: new Set(),
        lastQuery: log.createdAt,
        weakTopics: [],
      });
    }

    const data = studentMap.get(log.studentId)!;
    data.queryCount++;
    if (log.satisfied === true) data.satisfiedCount++;
    
    const topics = extractTopics(log.query);
    topics.forEach(t => data.topics.add(t));
    
    if (log.createdAt > data.lastQuery) {
      data.lastQuery = log.createdAt;
    }

    // Track weak topics (unsatisfied queries)
    if (log.satisfied === false) {
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
    studentName: `Student ${id.substring(0, 8)}`, // Anonymous
    queryCount: data.queryCount,
    avgScore: data.satisfiedCount / data.queryCount,
    outOfScopeRate: 0, // Not available
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
  const satisfied = logs.filter(l => l.satisfied === true).length;
  const unsatisfied = logs.filter(l => l.satisfied === false).length;

  const satisfactionRate = total > 0 ? (satisfied / total) * 100 : 0;

  const responseTimes = logs.map(l => l.responseTime || 0).filter(t => t > 0);
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;

  return {
    totalQueries: total,
    inScopeQueries: total, // All queries are in scope in current schema
    outOfScopeQueries: 0,
    lowRelevanceQueries: unsatisfied,
    inScopeRate: 100,
    outOfScopeRate: 0,
    avgScore: satisfactionRate / 100,
    avgResponseTime,
    uniqueStudents: new Set(logs.map(l => l.studentId)).size,
    uniqueTopics: new Set(logs.flatMap(l => extractTopics(l.query))).size,
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
      const logDate = new Date(l.createdAt);
      return logDate >= dayStart && logDate <= dayEnd;
    });

    const satisfied = dayLogs.filter(l => l.satisfied === true).length;

    series.push({
      date: dayStart.toISOString().split('T')[0],
      queries: dayLogs.length,
      inScope: dayLogs.length, // All in scope
      outOfScope: 0,
      avgScore: dayLogs.length > 0 ? satisfied / dayLogs.length : 0,
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
  // Higher confusion = lower satisfaction + higher response times
  const satisfactionRate = data.satisfactionRate || 0;
  const confusionFromSatisfaction = (100 - satisfactionRate) * 0.7;
  const confusionFromTime = Math.min((data.avgResponseTime / 10000) * 30, 30); // Normalize

  return confusionFromSatisfaction + confusionFromTime;
}

function calculateEngagement(data: any): string {
  const queriesPerDay = data.queryCount / 7; // Assuming 7-day window
  const satisfactionRate = (data.satisfiedCount / data.queryCount) * 100;

  if (queriesPerDay > 5 && satisfactionRate > 70) return 'high';
  if (queriesPerDay > 2 && satisfactionRate > 50) return 'medium';
  return 'low';
}
