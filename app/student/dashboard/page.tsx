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
  Clock,
  Zap,
  Bell,
  X,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardStats {
  enrolledCourses: number;
  availableDocuments: number;
  totalChunks: number;
  studyStreak: number;
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
        const [dashboardRes, notificationsRes] = await Promise.all([
          fetch("/api/student/dashboard"),
          fetch("/api/notifications?limit=5"),
        ]);

        const dashboardData = await dashboardRes.json();
        const notificationsData = await notificationsRes.json();

        if (!dashboardRes.ok) {
          throw new Error(dashboardData.error || "Failed to fetch dashboard");
        }

        setStats(dashboardData.stats);
        setDocumentsByCourse(dashboardData.documentsByCourse || []);
        setRecentDocuments(dashboardData.recentDocuments || []);
        
        if (notificationsRes.ok) {
          setNotifications(notificationsData.notifications || []);
          setUnreadCount(notificationsData.unreadCount || 0);
        }
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

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(notifications.filter(n => n._id !== notificationId));
    markAsRead(notificationId);
  };

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
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Newspaper Masthead */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="text-center mb-8 pb-6 border-b-[3px] border-t-[3px] border-foreground pt-4">
            <div className="text-[10px] tracking-[0.3em] mb-2 text-muted-foreground font-medium">
              VOL. I — NO. 1 • {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} • PRICE: FREE TRUTH
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase mb-2" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
              STUDENT CHRONICLE
            </h1>
            <div className="text-sm mt-3 italic text-muted-foreground" style={{ fontFamily: 'Georgia, serif' }}>
              "{getGreeting()}, {user?.name?.split(" ")[0]} — Your Daily Learning Report"
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Link href="/student/chat">
              <Button className="bg-foreground text-background hover:bg-foreground/90 border-3 border-foreground gap-2 font-bold uppercase text-xs tracking-wide px-6">
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
            className="space-y-8"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 border-2 border-foreground bg-background">
                      <BookOpen className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="px-2 py-1 border-2 border-foreground bg-background">
                      <span className="text-[9px] font-black tracking-[0.15em]">ACTIVE</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      {stats?.enrolledCourses || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.1em]">
                      Enrolled Courses
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 border-2 border-foreground bg-background">
                      <FileText className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="px-2 py-1 border-2 border-foreground bg-background">
                      <span className="text-[9px] font-black tracking-[0.15em]">READY</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      {stats?.availableDocuments || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.1em]">
                      Available Materials
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 border-2 border-foreground bg-background">
                      <Brain className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="px-2 py-1 border-2 border-foreground bg-background">
                      <span className="text-[9px] font-black tracking-[0.15em]">INDEXED</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                      {stats?.totalChunks || 0}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.1em]">
                      Knowledge Chunks
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box flex flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mb-3"
                  >
                    <Flame className="h-10 w-10 text-foreground" />
                  </motion.div>
                  <div className="text-4xl font-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    {stats?.studyStreak || 0}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-[0.1em]">
                    Day Streak
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-foreground">
                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Breaking News
                      {unreadCount > 0 && (
                        <div className="px-2 py-1 border-2 border-foreground bg-foreground text-background">
                          <span className="text-[9px] font-black tracking-wider">{unreadCount}</span>
                        </div>
                      )}
                    </h2>
                    <Link href="/student/notifications">
                      <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-wider hover:bg-foreground/5">
                        ALL
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-3 border-2 transition-all ${
                          notification.isRead
                            ? "border-foreground/20 bg-muted/20"
                            : "border-foreground/40 bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 border-2 border-foreground flex items-center justify-center flex-shrink-0 bg-background">
                            {notification.type === "document_uploaded" && <Upload className="h-4 w-4" />}
                            {notification.type === "document_indexed" && <Check className="h-4 w-4" />}
                            {notification.type === "course_created" && <BookOpen className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-bold">{notification.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 italic" style={{ fontFamily: 'Georgia, serif' }}>
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => dismissNotification(notification._id)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-[10px] font-bold uppercase tracking-wider"
                                onClick={() => markAsRead(notification._id)}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Course Materials */}
              <motion.div variants={fadeInUp} className="lg:col-span-2">
                <div className="feature-box h-full">
                  <div className="mb-6 pb-4 border-b-2 border-foreground">
                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Course Materials
                    </h2>
                  </div>
                  {documentsByCourse.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="italic" style={{ fontFamily: 'Georgia, serif' }}>No materials available yet</p>
                      <p className="text-xs mt-1">Check back later for course content</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documentsByCourse.map((doc, i) => (
                        <Link href="/student/chat" key={i}>
                          <div className="p-4 border-2 border-foreground/20 hover:border-foreground/40 transition-all group cursor-pointer bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 border-2 border-foreground"
                                  style={{ backgroundColor: getCourseColor(doc._id) }}
                                />
                                <div>
                                  <span className="font-black text-sm uppercase tracking-wide">
                                    {getCourseName(doc._id)}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                    {doc.count} {doc.count === 1 ? "document" : "documents"} • {doc.totalChunks} chunks
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                            <div className="h-2 bg-muted border-2 border-foreground/20">
                              <div className="h-full bg-foreground" style={{ width: '100%' }} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div variants={fadeInUp}>
                <div className="feature-box h-full">
                  <div className="mb-6 pb-4 border-b-2 border-foreground">
                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Quick Actions
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <Link href="/student/chat">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-foreground/5 border-2 border-foreground/30 hover:border-foreground/50 font-bold uppercase text-xs tracking-wider">
                        <MessageSquare className="h-4 w-4" />
                        Ask a Question
                      </Button>
                    </Link>
                    <Link href="/student/learn">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-foreground/5 border-2 border-foreground/30 hover:border-foreground/50 font-bold uppercase text-xs tracking-wider">
                        <Brain className="h-4 w-4" />
                        Browse Topics
                      </Button>
                    </Link>
                    <Link href="/student/analytics">
                      <Button variant="outline" className="w-full justify-start gap-2 hover:bg-foreground/5 border-2 border-foreground/30 hover:border-foreground/50 font-bold uppercase text-xs tracking-wider">
                        <TrendingUp className="h-4 w-4" />
                        View Progress
                      </Button>
                    </Link>
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
                      <Clock className="h-5 w-5" />
                      Recent Materials
                    </h2>
                  </div>
                  {recentDocuments.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                      No recent materials
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentDocuments.map((doc, i) => (
                        <div
                          key={i}
                          className="p-3 border-2 border-foreground/20 flex items-center gap-3 bg-card"
                        >
                          <FileText className="h-4 w-4 text-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              {getCourseName(doc.courseId)} • {formatTimeAgo(doc.indexedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <div className="feature-box">
                  <div className="mb-6 pb-4 border-b-2 border-foreground">
                    <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Suggested Questions
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {[
                      "Explain the key concepts from today's material",
                      "What are the main topics I should focus on?",
                      "Can you quiz me on what I've learned?",
                      "Help me understand the difficult parts",
                    ].map((q, i) => (
                      <Link href="/student/chat" key={i}>
                        <div className="p-3 border-2 border-foreground/20 hover:border-foreground/40 transition-colors cursor-pointer group flex items-center gap-3 bg-card">
                          <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                          <span className="text-sm">{q}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
