"use client";

import { motion } from "framer-motion";
import { Plus, Users, FileText, Settings, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function FacultyCoursesPage() {
  const courses = useCourseStore((s) => s.courses);

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
          <Button className="gradient-primary text-white border-0 gap-2">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </motion.div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {courses.map((course, i) => (
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {course.name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Instructor</span>
                    <span className="font-medium">{course.instructor}</span>
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
                  <Button variant="outline" className="w-full gap-2">
                    <BookOpen className="h-4 w-4" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
