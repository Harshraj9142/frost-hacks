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
  Zap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Newspaper Masthead */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="text-center mb-8 pb-6 border-b-[3px] border-t-[3px] border-foreground pt-4">
            <div className="text-[10px] tracking-[0.3em] mb-2 text-muted-foreground font-medium">
              VOL. I — NO. 1 • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} • PRICE: FREE TRUTH
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase mb-2" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
              THE FACULTY CHRONICLE
            </h1>
            <div className="text-sm mt-3 italic text-muted-foreground" style={{ fontFamily: 'Georgia, serif' }}>
              "Empowering Education Through Data-Driven Insights"
            </div>
          </div>
          <div className="flex justify-center">
            <Link href="/faculty/analytics">
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Advanced Analytics
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="space-y-8"
        >
          {/* Stats Grid - Feature Boxes Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Total Students",
                value: loading ? "..." : stats.totalStudents.toString(),
                subtitle: `${stats.activeStudents} active this week`,
                icon: Users,
                badge: "ENROLLED",
              },
              {
                label: "Total Queries",
                value: loading ? "..." : stats.totalQueries.toString(),
                subtitle: `${stats.totalQueriesAllTime} all time`,
                icon: MessageSquare,
                badge: "ACTIVE",
              },
              {
                label: "Engagement Rate",
                value: loading ? "..." : `${stats.engagementRate}%`,
                subtitle: stats.engagementRate >= 70 ? "Excellent performance" : stats.engagementRate >= 50 ? "Good progress" : "Needs attention",
                icon: Activity,
                badge: stats.engagementRate >= 70 ? "EXCELLENT" : "GOOD",
              },
              {
                label: "Avg Response",
                value: loading ? "..." : `${(stats.avgResponseTime / 1000).toFixed(1)}s`,
                subtitle: stats.avgResponseTime < 2000 ? "Fast response time" : "Normal speed",
                icon: Zap,
                badge: "VERIFIED",
              },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 border-2 border-foreground bg-background">
                      <stat.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="px-2 py-1 border-2 border-foreground bg-background">
                      <span className="text-[9px] font-black tracking-[0.15em]">
                        {stat.badge}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      {stat.value}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.1em] mb-2">
                      {stat.label}
                    </div>
                    <div className="text-xs text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                      {stat.subtitle}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Top Students */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box h-full">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-foreground">
                  <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Performers
                  </h2>
                  <Link href="/faculty/students">
                    <Button size="sm" variant="ghost" className="gap-1 text-[10px] font-black uppercase tracking-wider hover:bg-foreground/5">
                      ALL <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="italic" style={{ fontFamily: 'Georgia, serif' }}>Loading data...</p>
                    </div>
                  ) : topStudents.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                      No student activity yet
                    </div>
                  ) : (
                    topStudents.map((student, idx) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 border-2 border-foreground/20 hover:border-foreground/40 transition-colors bg-card"
                      >
                        <div className="flex items-center justify-center w-8 h-8 border-2 border-foreground bg-background text-foreground text-sm font-black">
                          {idx + 1}
                        </div>
                        <Avatar className="h-9 w-9 border-2 border-foreground/30">
                          <AvatarFallback className="text-xs font-black bg-muted">
                            {student.name.split(" ").map((n: string) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {student.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {student.queryCount} queries
                          </p>
                        </div>
                        <div className="px-2 py-1 border border-foreground/30 bg-background">
                          <span className="text-[9px] font-bold tracking-wider">
                            {formatTimeAgo(student.lastActive)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box h-full">
                <div className="mb-6 pb-4 border-b-2 border-foreground">
                  <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </h2>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="italic" style={{ fontFamily: 'Georgia, serif' }}>Loading data...</p>
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                      No recent activity
                    </div>
                  ) : (
                    recentActivity.slice(0, 5).map((activity) => {
                      const course = getCourseById(activity.courseId);
                      return (
                        <div
                          key={activity.id}
                          className="p-3 border-2 border-foreground/20 hover:border-foreground/40 transition-colors bg-card"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-xs font-bold truncate flex-1">
                              {activity.studentName}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 font-semibold tracking-wider">
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words mb-2 italic" style={{ fontFamily: 'Georgia, serif' }}>
                            {activity.query}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {course && (
                              <div className="px-2 py-1 border border-foreground/30 bg-background">
                                <span className="text-[9px] font-bold tracking-wider">
                                  {course.code}
                                </span>
                              </div>
                            )}
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 font-semibold">
                              {activity.responseTime}ms
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>

            {/* Document Stats */}
            <motion.div variants={fadeInUp}>
              <div className="feature-box h-full">
                <div className="mb-6 pb-4 border-b-2 border-foreground">
                  <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Document Stats
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Indexed
                      </span>
                      <span className="text-sm font-black">
                        {stats.indexedDocuments}/{stats.totalDocuments}
                      </span>
                    </div>
                    <div className="h-3 bg-muted border-2 border-foreground/20">
                      <div 
                        className="h-full bg-foreground transition-all"
                        style={{
                          width: stats.totalDocuments > 0
                            ? `${(stats.indexedDocuments / stats.totalDocuments) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                  {stats.processingDocuments > 0 && (
                    <div className="flex items-center justify-between p-3 border-2 border-foreground/20 bg-card">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-foreground animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Processing</span>
                      </div>
                      <span className="text-sm font-black">
                        {stats.processingDocuments}
                      </span>
                    </div>
                  )}
                  {stats.failedDocuments > 0 && (
                    <div className="flex items-center justify-between p-3 border-2 border-foreground/20 bg-card">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider">Failed</span>
                      </div>
                      <span className="text-sm font-black">
                        {stats.failedDocuments}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t-2 border-foreground/20">
                    <Link href="/faculty/documents">
                      <Button variant="outline" size="sm" className="w-full border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider text-xs">
                        Manage Documents
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="mb-6 pb-4 border-b-2 border-foreground">
                  <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Center
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="border-3 border-dashed border-foreground/30 p-8 text-center hover:border-foreground/50 transition-colors cursor-pointer group">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2 group-hover:text-foreground transition-colors" />
                    <p className="text-sm font-semibold">
                      Drag & drop PDFs, slides, or notes
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic" style={{ fontFamily: 'Georgia, serif' }}>
                      Supports PDF, PPTX, DOCX up to 50MB
                    </p>
                  </div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        <p className="italic" style={{ fontFamily: 'Georgia, serif' }}>Loading documents...</p>
                      </div>
                    ) : recentDocuments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                        No documents uploaded yet
                      </div>
                    ) : (
                      recentDocuments.map((file) => (
                        <div
                          key={file._id}
                          className="flex items-center gap-3 p-3 border-2 border-foreground/20 hover:border-foreground/40 transition-colors bg-card"
                        >
                          <FileText className="h-4 w-4 text-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB
                              {file.pageCount && ` • ${file.pageCount} pages`}
                              {file.chunkCount && ` • ${file.chunkCount} chunks`}
                            </p>
                          </div>
                          <div className="px-2 py-1 border border-foreground/30 bg-background flex items-center gap-1">
                            {file.status === "indexed" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : file.status === "processing" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <span className="text-[9px] font-bold tracking-wider uppercase">
                              {file.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <div className="feature-box">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-foreground">
                  <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Manager
                  </h2>
                  <Button size="sm" variant="ghost" className="gap-1 text-[10px] font-black uppercase tracking-wider hover:bg-foreground/5">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 border-2 border-foreground/20 hover:border-foreground/40 transition-colors group bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 border-2 border-foreground"
                              style={{ backgroundColor: course.color }}
                            />
                            <span className="font-black text-sm uppercase tracking-wide">
                              {course.code}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 italic" style={{ fontFamily: 'Georgia, serif' }}>
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
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {course.studentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {course.documentCount} docs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
