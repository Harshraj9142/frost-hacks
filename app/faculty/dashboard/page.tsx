"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  MessageSquare,
  Users,
  AlertTriangle,
  Upload,
  Plus,
  FileText,
  Trash2,
  BookOpen,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCourseStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function FacultyDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const courses = useCourseStore((s) => s.courses);
  
  const [stats, setStats] = useState({
    totalDocuments: 0,
    indexedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalQueries: 0,
    totalQueriesAllTime: 0,
    avgResponseTime: 0,
    engagementRate: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [queryTrends, setQueryTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/faculty/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentDocuments(data.recentDocuments);
        setTopStudents(data.topStudents || []);
        setRecentActivity(data.recentActivity || []);
        setQueryTrends(data.queryTrends || []);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCourseById = (courseId: string) => {
    return courses.find((c) => c.id === courseId);
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's how your students are doing
            </p>
          </div>
        </motion.div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Students",
                value: loading ? "..." : stats.totalStudents.toString(),
                change: `${stats.activeStudents} active (7d)`,
                icon: Users,
                color: "text-primary",
                trend: stats.engagementRate >= 50 ? "up" : "down",
              },
              {
                label: "Total Queries",
                value: loading ? "..." : stats.totalQueries.toString(),
                change: `${stats.totalQueriesAllTime} all time`,
                icon: MessageSquare,
                color: "text-foreground",
                trend: "up",
              },
              {
                label: "Engagement Rate",
                value: loading ? "..." : `${stats.engagementRate}%`,
                change: stats.engagementRate >= 70 ? "Excellent" : stats.engagementRate >= 50 ? "Good" : "Needs attention",
                icon: Activity,
                color: "text-foreground",
                trend: stats.engagementRate >= 50 ? "up" : "down",
              },
              {
                label: "Avg Response",
                value: loading ? "..." : `${(stats.avgResponseTime / 1000).toFixed(1)}s`,
                change: stats.avgResponseTime < 2000 ? "Fast" : "Normal",
                icon: Zap,
                color: "text-foreground",
                trend: stats.avgResponseTime < 2000 ? "up" : "neutral",
              },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      <div className="flex items-center gap-1 text-xs">
                        {stat.trend === "up" && (
                          <TrendingUp className="h-3 w-3 text-foreground/60" />
                        )}
                        {stat.trend === "down" && (
                          <TrendingDown className="h-3 w-3 text-foreground/60" />
                        )}
                        <span className="text-muted-foreground">
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top Students */}
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Top Students
                    </CardTitle>
                    <Link href="/faculty/students">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7">
                        View All <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : topStudents.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No student activity yet
                    </div>
                  ) : (
                    topStudents.map((student, idx) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {idx + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {student.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.queryCount} queries
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatTimeAgo(student.lastActive)}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No recent activity
                    </div>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => {
                      const course = getCourseById(activity.courseId);
                      return (
                        <div
                          key={activity.id}
                          className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs font-medium truncate flex-1">
                              {activity.studentName}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 break-words">
                            {activity.query}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {course && (
                              <Badge
                                variant="outline"
                                className="text-xs flex-shrink-0"
                                style={{ borderColor: course.color + "40" }}
                              >
                                {course.code}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {activity.responseTime}ms
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Document Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Indexed
                        </span>
                        <span className="text-sm font-medium">
                          {stats.indexedDocuments}/{stats.totalDocuments}
                        </span>
                      </div>
                      <Progress
                        value={
                          stats.totalDocuments > 0
                            ? (stats.indexedDocuments / stats.totalDocuments) * 100
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                    {stats.processingDocuments > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-foreground animate-spin" />
                          <span className="text-sm">Processing</span>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.processingDocuments}
                        </span>
                      </div>
                    )}
                    {stats.failedDocuments > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-foreground" />
                          <span className="text-sm">Failed</span>
                        </div>
                        <span className="text-sm font-medium">
                          {stats.failedDocuments}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-border/50">
                    <Link href="/faculty/documents">
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Documents
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    Upload Center
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer group">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop PDFs, slides, or notes
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Supports PDF, PPTX, DOCX up to 50MB
                    </p>
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading documents...
                      </div>
                    ) : recentDocuments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No documents uploaded yet
                      </div>
                    ) : (
                      recentDocuments.map((file) => (
                        <div
                          key={file._id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                              {file.pageCount && ` • ${file.pageCount} pages`}
                              {file.chunkCount && ` • ${file.chunkCount} chunks`}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {file.status === "indexed" ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : file.status === "processing" ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {file.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Course Manager
                    </CardTitle>
                    <Button size="sm" variant="outline" className="gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Add Course
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: course.color }}
                            />
                            <span className="font-medium text-sm">
                              {course.code}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {course.name}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {course.studentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {course.documentCount}{" "}
                          docs
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>


        </motion.div>
      </div>
    </div>
  );
}
