"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Users, FileText, Settings, Trash2, BookOpen, Loader2, Database, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  studentCount: number;
  documentCount: number;
  indexedCount: number;
  totalChunks: number;
  instructor: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function FacultyCoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/faculty/courses");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch courses");
        }

        setCourses(data.courses || []);
      } catch (error: any) {
        console.error("Error fetching courses:", error);
        toast.error(error.message || "Failed to fetch courses");
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchCourses();
    }
  }, [session]);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Course Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your courses, students, and materials
            </p>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold">{courses.length}</div>
                <div className="text-xs text-muted-foreground">Total Courses</div>
              </div>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Courses will appear here once they are assigned to you
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courses.map((course) => (
              <motion.div key={course.id} variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: course.color }}
                        />
                        <CardTitle className="text-base">{course.code}</CardTitle>
                      </div>
                      {course.indexedCount > 0 && (
                        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {course.name}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Instructor</span>
                      <span className="font-medium truncate ml-2">{course.instructor}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Users className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
                        <div className="text-lg font-bold">{course.studentCount}</div>
                        <div className="text-xs text-muted-foreground">Students</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <FileText className="h-4 w-4 mx-auto mb-1 text-cyan-400" />
                        <div className="text-lg font-bold">{course.documentCount}</div>
                        <div className="text-xs text-muted-foreground">Documents</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
                        <div className="text-sm font-bold text-primary">{course.indexedCount}</div>
                        <div className="text-xs text-muted-foreground">Indexed</div>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
                        <div className="text-sm font-bold text-primary">{course.totalChunks}</div>
                        <div className="text-xs text-muted-foreground">Chunks</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
