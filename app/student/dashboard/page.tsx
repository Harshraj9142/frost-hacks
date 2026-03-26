"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  MessageSquare,
  TrendingUp,
  Brain,
  Flame,
  ChevronRight,
  BookOpen,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Clock,
  Award,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardStats {
  enrolledCourses: number;
  availableDocuments: number;
  totalChunks: number;
}

interface DocumentByCourse {
  _id: string;
  count: number;
  totalChunks: number;
}

interface RecentDocument {
  fileName: string;
  courseId: string;
  indexedAt: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const courses = useCourseStore((s) => s.courses);
  const user = session?.user;
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [documentsByCourse, setDocumentsByCourse] = useState<DocumentByCourse[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/student/dashboard");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch dashboard");
        }

        setStats(data.stats);
        setDocumentsByCourse(data.documentsByCourse || []);
        setRecentDocuments(data.recentDocuments || []);
      } catch (error: any) {
        console.error("Dashboard error:", error);
        toast.error(error.message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchDashboard();
    }
  }, [session]);

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.code : courseId;
  };

  const getCourseColor = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.color || "#3b82f6";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                {getGreeting()}, {user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Link href="/student/chat">
              <Button className="gradient-primary text-white border-0 gap-2 shadow-lg">
                <Sparkles className="h-4 w-4" />
                Start Learning
              </Button>
            </Link>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="space-y-6"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    </div>
                    <div className="text-2xl font-bold">{stats?.enrolledCourses || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Enrolled Courses
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                        Ready
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{stats?.availableDocuments || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Available Materials
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Brain className="h-5 w-5 text-cyan-400" />
                      <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400/30">
                        Indexed
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">{stats?.totalChunks || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Knowledge Chunks
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all">
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Flame className="h-8 w-8 text-orange-400 mb-2" />
                    </motion.div>
                    <div className="text-2xl font-bold">7</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Day Streak 🔥
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Course Materials */}
              <motion.div variants={fadeInUp} className="lg:col-span-2">
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Your Course Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documentsByCourse.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No materials available yet</p>
                        <p className="text-xs mt-1">Check back later for course content</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documentsByCourse.map((doc, i) => (
                          <Link href="/student/chat" key={i}>
                            <div className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all group cursor-pointer border border-transparent hover:border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getCourseColor(doc._id) }}
                                  />
                                  <div>
                                    <span className="font-medium text-sm">
                                      {getCourseName(doc._id)}
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.count} {doc.count === 1 ? "document" : "documents"} • {doc.totalChunks} chunks
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <Progress 
                                value={100} 
                                className="h-1.5"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/student/chat">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-primary/10">
                        <MessageSquare className="h-4 w-4" />
                        Ask a Question
                      </Button>
                    </Link>
                    <Link href="/student/learn">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-primary/10">
                        <Brain className="h-4 w-4" />
                        Browse Topics
                      </Button>
                    </Link>
                    <Link href="/student/analytics">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-primary/10">
                        <TrendingUp className="h-4 w-4" />
                        View Progress
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Activity & Suggestions */}
            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Recently Added Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentDocuments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No recent materials
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentDocuments.map((doc, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-muted/30 flex items-center gap-3"
                          >
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {getCourseName(doc.courseId)} • {formatTimeAgo(doc.indexedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Suggested Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      "Explain the key concepts from today's material",
                      "What are the main topics I should focus on?",
                      "Can you quiz me on what I've learned?",
                      "Help me understand the difficult parts",
                    ].map((q, i) => (
                      <Link href="/student/chat" key={i}>
                        <div className="p-3 rounded-lg bg-muted/30 hover:bg-primary/10 transition-colors cursor-pointer group flex items-center gap-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          <span className="text-sm">{q}</span>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
