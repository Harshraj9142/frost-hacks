"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Users,
  MessageSquare,
  Clock,
  Target,
  Brain,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCourseStore } from "@/lib/store";
import { CourseLoader } from "@/components/course-loader";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const courses = useCourseStore((s) => s.courses);
  const isLoadingCourses = useCourseStore((s) => s.isLoading);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses, selectedCourse]);

  useEffect(() => {
    if (selectedCourse) {
      fetchAnalytics();
    }
  }, [selectedCourse, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/faculty/analytics?courseId=${selectedCourse}&timeRange=${timeRange}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to fetch analytics");
        toast.error(errorData.error || "Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setError("Network error. Please try again.");
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while courses are being fetched
  if (isLoadingCourses) {
    return (
      <>
        <CourseLoader />
        <div className="min-h-screen pt-14 p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading courses...</p>
          </div>
        </div>
      </>
    );
  }

  // Show empty state if no courses
  if (courses.length === 0) {
    return (
      <>
        <CourseLoader />
        <div className="min-h-screen pt-14 p-8 flex items-center justify-center">
          <div className="text-center max-w-md">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No Courses Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create a course first to view analytics data
            </p>
            <Button onClick={() => window.location.href = "/faculty/courses"}>
              Go to Courses
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CourseLoader />
      <div className="min-h-screen pt-14 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">COURSE ANALYTICS</h1>
            <p className="text-sm mt-1">
              Insights and performance metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex gap-2">
              {["7d", "30d", "90d"].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
                </Button>
              ))}
            </div>

            {/* Course Selector */}
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 rounded-lg border bg-background"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Retry</Button>
          </div>
        ) : analytics ? (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={MessageSquare}
                label="Total Queries"
                value={analytics.overallStats.totalQueries}
              />
              <StatCard
                icon={Users}
                label="Active Students"
                value={analytics.overallStats.uniqueStudents}
              />
              <StatCard
                icon={Target}
                label="Avg Accuracy"
                value={`${(analytics.overallStats.avgScore * 100).toFixed(1)}%`}
              />
              <StatCard
                icon={Clock}
                label="Avg Response Time"
                value={`${(analytics.overallStats.avgResponseTime / 1000).toFixed(1)}s`}
              />
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="topics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
                <TabsTrigger value="weak">Weak Concepts</TabsTrigger>
                <TabsTrigger value="students">Student Tracking</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              {/* Topic Analysis Tab */}
              <TabsContent value="topics" className="space-y-6">
                <TopicAnalysis data={analytics.topicAnalysis} />
                <TopicClusters data={analytics.topicClusters} />
              </TabsContent>

              {/* Weak Concepts Tab */}
              <TabsContent value="weak" className="space-y-6">
                <WeakConceptsHeatmap data={analytics.weakConcepts} />
              </TabsContent>

              {/* Student Tracking Tab */}
              <TabsContent value="students" className="space-y-6">
                <StudentTracking data={analytics.studentTracking} />
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6">
                <TrendsChart data={analytics.timeSeriesData} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-20">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">
              No student queries recorded yet for this course
            </p>
            <p className="text-sm text-muted-foreground">
              Analytics will appear once students start using the chat feature
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="feature-box p-6">
      <div className="flex items-center justify-between">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold font-serif">{value}</p>
        <p className="text-sm uppercase font-bold tracking-wider mt-1">{label}</p>
      </div>
    </Card>
  );
}

// Topic Analysis Component
function TopicAnalysis({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>No topic data available</p>;
  }

  return (
    <Card className="feature-box p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg uppercase font-bold tracking-wider font-serif">Topic-wise Confusion Analysis</h3>
        <Badge variant="outline" className="uppercase font-bold tracking-wider">Top {data.length} Topics</Badge>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {data.map((topic, index) => (
            <motion.div
              key={topic.topic}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{topic.topic}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {topic.count} queries • Avg score: {(topic.avgScore * 100).toFixed(1)}%
                  </p>
                </div>
                <ConfusionBadge level={topic.confusionLevel} />
              </div>

              {/* Confusion Heatmap Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confusion Level</span>
                  <span>{topic.confusionLevel.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      topic.confusionLevel > 50
                        ? "bg-red-500"
                        : topic.confusionLevel > 30
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(topic.confusionLevel, 100)}%` }}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Out of Scope</p>
                  <p className="text-sm font-medium">{topic.outOfScopeRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Low Relevance</p>
                  <p className="text-sm font-medium">{topic.lowRelevanceRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                  <p className="text-sm font-medium">
                    {(topic.avgResponseTime / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Confusion Badge
function ConfusionBadge({ level }: { level: number }) {
  if (level > 50) {
    return (
      <Badge variant="outline" className="uppercase font-bold tracking-wider">
        <AlertTriangle className="h-3 w-3 mr-1" />
        High Confusion
      </Badge>
    );
  }
  if (level > 30) {
    return (
      <Badge variant="outline" className="uppercase font-bold tracking-wider">
        Medium Confusion
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="uppercase font-bold tracking-wider">
      Low Confusion
    </Badge>
  );
}

// Topic Clusters Component
function TopicClusters({ data }: { data: any }) {
  if (!data) return null;

  const clusters = Object.entries(data).filter(([_, value]: any) => value.count > 0);

  return (
    <Card className="feature-box p-6">
      <h3 className="text-lg uppercase font-bold tracking-wider font-serif mb-6">Topic Clustering</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map(([name, cluster]: any) => (
          <div
            key={name}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium capitalize">{name}</h4>
              <Badge variant="outline">{cluster.count}</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Score</span>
                <span className="font-medium">
                  {(cluster.avgScore * 100).toFixed(1)}%
                </span>
              </div>

              {cluster.topics.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Sample Topics:</p>
                  <div className="space-y-1">
                    {cluster.topics.slice(0, 3).map((topic: string, i: number) => (
                      <p key={i} className="text-xs truncate">
                        • {topic}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Weak Concepts Heatmap
function WeakConceptsHeatmap({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="feature-box p-6">
        <p>No weak concepts identified</p>
      </Card>
    );
  }

  return (
    <Card className="feature-box p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg uppercase font-bold tracking-wider font-serif">Weak Concepts Heatmap</h3>
        <Badge variant="outline" className="uppercase font-bold tracking-wider">Top {data.length} Weak Areas</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((concept, index) => (
          <motion.div
            key={concept.concept}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border ${
              concept.severity === "high"
                ? "bg-red-500/10 border-red-500/30"
                : concept.severity === "medium"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-blue-500/10 border-blue-500/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium">{concept.concept}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {concept.attempts} attempts
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  concept.severity === "high"
                    ? "text-red-400 border-red-400/30"
                    : concept.severity === "medium"
                    ? "text-amber-400 border-amber-400/30"
                    : "text-blue-400 border-blue-400/30"
                }
              >
                {concept.severity}
              </Badge>
            </div>

            {/* Weakness Score Bar */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Weakness Score</span>
                <span>{concept.weaknessScore.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    concept.severity === "high"
                      ? "bg-red-500"
                      : concept.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(concept.weaknessScore, 100)}%` }}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Avg Score</p>
                <p className="font-medium">{(concept.avgScore * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Low Scores</p>
                <p className="font-medium">{concept.lowScoreRate.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Out of Scope</p>
                <p className="font-medium">{concept.outOfScopeRate.toFixed(0)}%</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm mb-1">Recommendations</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Consider uploading additional materials for weak concepts</li>
              <li>• Review and clarify content for high-confusion topics</li>
              <li>• Create targeted exercises for struggling areas</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Student Tracking Component
function StudentTracking({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="feature-box p-6">
        <p>No student data available</p>
      </Card>
    );
  }

  return (
    <Card className="feature-box p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg uppercase font-bold tracking-wider font-serif">Student-wise Query Tracking</h3>
        <Badge variant="outline" className="uppercase font-bold tracking-wider">{data.length} Students</Badge>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {data.map((student, index) => (
            <motion.div
              key={student.studentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium">{student.studentName}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.queryCount} queries • {student.topicsExplored} topics explored
                  </p>
                </div>
                <EngagementBadge level={student.engagement} />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-sm font-medium">
                    {(student.avgScore * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Out of Scope</p>
                  <p className="text-sm font-medium">
                    {student.outOfScopeRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Topics</p>
                  <p className="text-sm font-medium">{student.topicsExplored}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Query</p>
                  <p className="text-sm font-medium">
                    {new Date(student.lastQuery).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Weak Topics */}
              {student.weakTopics.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Weak Topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {student.weakTopics.map((topic: string) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="text-xs text-amber-400 border-amber-400/30"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Engagement Badge
function EngagementBadge({ level }: { level: string }) {
  return (
    <Badge variant="outline" className="uppercase font-bold tracking-wider">
      {level} engagement
    </Badge>
  );
}

// Trends Chart Component
function TrendsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="feature-box p-6">
        <p>No trend data available</p>
      </Card>
    );
  }

  const maxQueries = Math.max(...data.map((d) => d.queries));

  return (
    <Card className="feature-box p-6">
      <h3 className="text-lg uppercase font-bold tracking-wider font-serif mb-6">Query Trends Over Time</h3>

      <div className="space-y-6">
        {/* Bar Chart */}
        <div className="space-y-2">
          {data.map((day, index) => (
            <div key={day.date} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400">{day.inScope} in-scope</span>
                  <span className="text-red-400">{day.outOfScope} out-of-scope</span>
                  <span className="font-medium">{day.queries} total</span>
                </div>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden flex">
                <div
                  className="bg-emerald-500/50 hover:bg-emerald-500/70 transition-colors"
                  style={{ width: `${(day.inScope / maxQueries) * 100}%` }}
                />
                <div
                  className="bg-red-500/50 hover:bg-red-500/70 transition-colors"
                  style={{ width: `${(day.outOfScope / maxQueries) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {data.reduce((sum, d) => sum + d.queries, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Queries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {data.reduce((sum, d) => sum + d.inScope, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">In-Scope</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">
              {data.reduce((sum, d) => sum + d.outOfScope, 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Out-of-Scope</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
