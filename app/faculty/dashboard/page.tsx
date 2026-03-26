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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCourseStore } from "@/lib/store";

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
  const user = session?.user;
  const courses = useCourseStore((s) => s.courses);
  
  const [stats, setStats] = useState({
    totalDocuments: 0,
    indexedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
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
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
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
                label: "Total Documents",
                value: loading ? "..." : stats.totalDocuments.toString(),
                change: stats.failedDocuments > 0 ? `${stats.failedDocuments} failed` : "All good",
                icon: FileText,
                color: "text-primary",
              },
              {
                label: "Indexed Documents",
                value: loading ? "..." : stats.indexedDocuments.toString(),
                change: `${stats.totalDocuments > 0 ? Math.round((stats.indexedDocuments / stats.totalDocuments) * 100) : 0}% complete`,
                icon: CheckCircle2,
                color: "text-emerald-400",
              },
              {
                label: "Processing",
                value: loading ? "..." : stats.processingDocuments.toString(),
                change: stats.processingDocuments > 0 ? "In progress" : "Ready",
                icon: Loader2,
                color: "text-amber-400",
              },
              {
                label: "Courses",
                value: courses.length.toString(),
                change: `${stats.totalDocuments} total docs`,
                icon: BookOpen,
                color: "text-cyan-400",
              },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className={`h-5 w-5 ${stat.color} ${stat.label === "Processing" && stats.processingDocuments > 0 ? "animate-spin" : ""}`} />
                      <span className="text-xs text-muted-foreground">
                        {stat.change}
                      </span>
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
                            variant={
                              file.status === "indexed" ? "secondary" : "outline"
                            }
                            className={`text-xs ${
                              file.status === "indexed"
                                ? "text-emerald-400 border-emerald-400/30"
                                : file.status === "processing"
                                ? "text-amber-400 border-amber-400/30"
                                : "text-red-400 border-red-400/30"
                            }`}
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
