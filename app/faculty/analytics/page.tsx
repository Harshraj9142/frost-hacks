"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Users,
  MessageSquare,
  Activity,
  Loader2,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCourseStore } from "@/lib/store";
import { AnalyticsHelpDialog } from "@/components/analytics-help-dialog";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function FacultyAnalyticsPage() {
  const { data: session } = useSession();
  const courses = useCourseStore((s) => s.courses);
  
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
  }, [courses]);

  useEffect(() => {
    if (selectedCourse) {
      fetchAnalytics();
    }
  }, [selectedCourse, timeRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/faculty/analytics?courseId=${selectedCourse}&timeRange=${timeRange}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground italic">
                Deep insights into student learning patterns and concept mastery
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AnalyticsHelpDialog />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
                className="border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedCourse} onValueChange={(value) => setSelectedCourse(value || "")}>
                <SelectTrigger className="border-2 border-foreground font-bold">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 border-2 border-foreground"
                          style={{ backgroundColor: course.color }}
                        />
                        <span className="font-bold">{course.code}</span>
                        <span className="text-muted-foreground">- {course.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value || "7d")}>
                <SelectTrigger className="border-2 border-foreground font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {loading && !analytics ? (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-foreground" />
            <p className="text-muted-foreground italic">Loading analytics...</p>
          </div>
        ) : analytics ? (
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="space-y-8"
          >
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-center justify-between mb-4">
                    <MessageSquare className="h-6 w-6" />
                    <Badge className="border-2 border-foreground">TOTAL</Badge>
                  </div>
                  <div className="text-3xl font-black mb-1">
                    {analytics.overallStats.totalQueries}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Queries
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-6 w-6" />
                    <Badge className="border-2 border-foreground">ACTIVE</Badge>
                  </div>
                  <div className="text-3xl font-black mb-1">
                    {analytics.overallStats.uniqueStudents}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Unique Students
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-center justify-between mb-4">
                    <Activity className="h-6 w-6" />
                    <Badge className="border-2 border-foreground">SCORE</Badge>
                  </div>
                  <div className="text-3xl font-black mb-1">
                    {(analytics.overallStats.avgScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Avg Satisfaction
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="h-6 w-6" />
                    <Badge className="border-2 border-foreground">TOPICS</Badge>
                  </div>
                  <div className="text-3xl font-black mb-1">
                    {analytics.overallStats.uniqueTopics}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Topics Explored
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Topic-wise Confusion Heatmap */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="pb-4 border-b-2 border-foreground mb-6">
                  <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Topic Confusion Heatmap
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    Darker colors indicate higher confusion levels
                  </p>
                </div>
                <div>
                  <div className="space-y-3">
                    {analytics.topicAnalysis.slice(0, 10).map((topic: any, idx: number) => {
                      const confusionLevel = topic.confusionLevel;
                      const intensity = Math.min(confusionLevel / 100, 1);
                      
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-sm font-bold min-w-[200px]">
                                {topic.topic}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{topic.count} queries</span>
                                <span>•</span>
                                <span>{topic.satisfactionRate.toFixed(0)}% satisfied</span>
                              </div>
                            </div>
                            <Badge
                              variant={
                                confusionLevel > 60
                                  ? "destructive"
                                  : confusionLevel > 30
                                  ? "default"
                                  : "secondary"
                              }
                              className="border-2 border-foreground"
                            >
                              {confusionLevel > 60 ? "HIGH" : confusionLevel > 30 ? "MEDIUM" : "LOW"}
                            </Badge>
                          </div>
                          <div className="relative h-8 border-2 border-foreground bg-background overflow-hidden">
                            <div
                              className="absolute inset-0 transition-all"
                              style={{
                                background: `linear-gradient(to right, 
                                  rgba(239, 68, 68, ${intensity * 0.3}), 
                                  rgba(239, 68, 68, ${intensity * 0.8}))`,
                                width: `${confusionLevel}%`,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-3">
                              <span className="text-xs font-bold">
                                Confusion: {confusionLevel.toFixed(0)}%
                              </span>
                              <span className="text-xs font-semibold">
                                Avg: {(topic.avgResponseTime / 1000).toFixed(1)}s
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Weak Concepts Grid */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="pb-4 border-b-2 border-foreground mb-6">
                  <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Weak Concepts Identification
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    Concepts requiring additional attention and resources
                  </p>
                </div>
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.weakConcepts.slice(0, 9).map((concept: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 border-2 border-foreground/30 hover:border-foreground transition-colors bg-card"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-black uppercase tracking-wide flex-1">
                            {concept.concept}
                          </h3>
                          <Badge
                            variant={
                              concept.severity === "high"
                                ? "destructive"
                                : concept.severity === "medium"
                                ? "default"
                                : "secondary"
                            }
                            className="border-2 border-foreground text-[9px]"
                          >
                            {concept.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Weakness Score</span>
                            <span className="font-bold">{concept.weaknessScore.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-muted border border-foreground/20">
                            <div
                              className={`h-full transition-all ${
                                concept.severity === "high"
                                  ? "bg-red-500"
                                  : concept.severity === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${concept.weaknessScore}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs pt-2">
                            <span className="text-muted-foreground">Attempts</span>
                            <span className="font-bold">{concept.attempts}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Low Score Rate</span>
                            <span className="font-bold">{concept.lowScoreRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Topic Clustering */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="pb-4 border-b-2 border-foreground mb-6">
                  <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Topic Clustering Analysis
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    Questions grouped by topic categories
                  </p>
                </div>
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(analytics.topicClusters).map(([key, cluster]: [string, any]) => {
                      if (cluster.count === 0) return null;
                      
                      const clusterNames: Record<string, string> = {
                        algorithms: "Algorithms",
                        dataStructures: "Data Structures",
                        complexity: "Complexity Analysis",
                        implementation: "Implementation",
                        theory: "Theory & Concepts",
                        other: "Other Topics",
                      };

                      return (
                        <div
                          key={key}
                          className="p-5 border-2 border-foreground/30 hover:border-foreground transition-colors bg-card"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black uppercase tracking-wide">
                              {clusterNames[key]}
                            </h3>
                            <div className="text-right">
                              <div className="text-2xl font-black">{cluster.count}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                queries
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-muted-foreground">Avg Score</span>
                              <span className="font-bold">
                                {(cluster.avgScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-3 bg-muted border-2 border-foreground/20">
                              <div
                                className="h-full bg-foreground transition-all"
                                style={{ width: `${cluster.avgScore * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              Sample Questions:
                            </div>
                            {cluster.topics.slice(0, 3).map((topic: string, idx: number) => (
                              <div
                                key={idx}
                                className="text-xs p-2 border border-foreground/20 bg-background italic line-clamp-2"
                              >
                                {topic}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Student-wise Query Tracking */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="pb-4 border-b-2 border-foreground mb-6">
                  <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Student-wise Query Tracking
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    Individual student performance and engagement metrics
                  </p>
                </div>
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-foreground">
                          <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Student
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Queries
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Avg Score
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Topics
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Engagement
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider">
                            Weak Topics
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.studentTracking.slice(0, 15).map((student: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b border-foreground/20 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-sm">{student.studentName}</div>
                              <div className="text-xs text-muted-foreground">
                                Last: {new Date(student.lastQuery).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <div className="text-lg font-black">{student.queryCount}</div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm font-bold">
                                  {(student.avgScore * 100).toFixed(0)}%
                                </span>
                                {student.avgScore >= 0.7 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : student.avgScore >= 0.5 ? (
                                  <Activity className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge className="border-2 border-foreground">
                                {student.topicsExplored}
                              </Badge>
                            </td>
                            <td className="text-center py-3 px-4">
                              <Badge
                                variant={
                                  student.engagement === "high"
                                    ? "default"
                                    : student.engagement === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="border-2 border-foreground uppercase"
                              >
                                {student.engagement}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {student.weakTopics.slice(0, 3).map((topic: string, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-1 border border-foreground/30 bg-background font-semibold"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Time Series Trends */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="pb-4 border-b-2 border-foreground mb-6">
                  <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Query Trends Over Time
                  </h2>
                </div>
                <div>
                  <div className="space-y-2">
                    {analytics.timeSeriesData.map((day: any, idx: number) => {
                      const maxQueries = Math.max(
                        ...analytics.timeSeriesData.map((d: any) => d.queries)
                      );
                      const width = maxQueries > 0 ? (day.queries / maxQueries) * 100 : 0;

                      return (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-24 text-xs font-bold text-muted-foreground">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="flex-1">
                            <div className="relative h-8 border-2 border-foreground/20 bg-background">
                              <div
                                className="absolute inset-y-0 left-0 bg-foreground transition-all"
                                style={{ width: `${width}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-3">
                                <span className="text-xs font-bold">{day.queries} queries</span>
                                <span className="text-xs font-semibold">
                                  {(day.avgScore * 100).toFixed(0)}% satisfied
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground italic">
              Select a course to view analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
