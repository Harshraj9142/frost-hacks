"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Loader2,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";

interface Stats {
  totalDocuments: number;
  indexedDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
  totalStudents: number;
  totalChunks: number;
}

interface DocumentByCourse {
  _id: string;
  count: number;
  indexed: number;
  totalChunks: number;
}

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [documentsByCourse, setDocumentsByCourse] = useState<DocumentByCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/faculty/stats");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch stats");
        }

        setStats(data.stats);
        setDocumentsByCourse(data.documentsByCourse || []);
      } catch (error: any) {
        console.error("Error fetching stats:", error);
        toast.error(error.message || "Failed to fetch analytics");
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.code : courseId;
  };

  const calculateIndexingRate = () => {
    if (!stats || stats.totalDocuments === 0) return 0;
    return Math.round((stats.indexedDocuments / stats.totalDocuments) * 100);
  };
  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Insights into student learning patterns
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !stats ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <AlertTriangle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to load analytics</h3>
              <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
            </CardContent>
          </Card>
        ) : (
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
                  value: stats.totalDocuments.toString(),
                  change: `${stats.indexedDocuments} indexed`,
                  icon: FileText,
                  color: "text-primary",
                },
                {
                  label: "Total Students",
                  value: stats.totalStudents.toString(),
                  change: "Enrolled",
                  icon: Users,
                  color: "text-emerald-400",
                },
                {
                  label: "Indexing Rate",
                  value: `${calculateIndexingRate()}%`,
                  change: `${stats.processingDocuments} processing`,
                  icon: TrendingUp,
                  color: "text-cyan-400",
                },
                {
                  label: "Total Chunks",
                  value: stats.totalChunks.toString(),
                  change: "Indexed",
                  icon: Database,
                  color: "text-amber-400",
                },
              ].map((stat, i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="glass border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
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

            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Documents by Course
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentsByCourse.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No documents uploaded yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documentsByCourse
                        .sort((a, b) => b.count - a.count)
                        .map((doc, i) => {
                          const indexingRate = doc.count > 0 
                            ? Math.round((doc.indexed / doc.count) * 100)
                            : 0;
                          return (
                            <div key={i} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {getCourseName(doc._id)}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">
                                    {doc.count} {doc.count === 1 ? "document" : "documents"}
                                  </span>
                                  <span className="text-xs text-primary font-medium">
                                    {indexingRate}% indexed
                                  </span>
                                </div>
                              </div>
                              <Progress value={indexingRate} className="h-2" />
                              {doc.totalChunks > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {doc.totalChunks} chunks indexed
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Document Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          label: "Indexed", 
                          value: stats.indexedDocuments, 
                          total: stats.totalDocuments,
                          color: "bg-emerald-500" 
                        },
                        { 
                          label: "Processing", 
                          value: stats.processingDocuments, 
                          total: stats.totalDocuments,
                          color: "bg-amber-500" 
                        },
                        { 
                          label: "Failed", 
                          value: stats.failedDocuments, 
                          total: stats.totalDocuments,
                          color: "bg-red-500" 
                        },
                      ].map((segment, i) => {
                        const percentage = stats.totalDocuments > 0
                          ? Math.round((segment.value / segment.total) * 100)
                          : 0;
                        return (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{segment.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{segment.value}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${segment.color} rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <Card className="glass border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">System Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm">Documents</span>
                        </div>
                        <span className="text-lg font-bold">{stats.totalDocuments}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-emerald-400" />
                          <span className="text-sm">Students</span>
                        </div>
                        <span className="text-lg font-bold">{stats.totalStudents}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-cyan-400" />
                          <span className="text-sm">Indexed Chunks</span>
                        </div>
                        <span className="text-lg font-bold">{stats.totalChunks}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-amber-400" />
                          <span className="text-sm">Success Rate</span>
                        </div>
                        <span className="text-lg font-bold">{calculateIndexingRate()}%</span>
                      </div>
                    </div>
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
