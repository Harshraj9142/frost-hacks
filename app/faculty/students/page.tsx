"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Search, Filter, TrendingUp, TrendingDown, Minus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email: string;
  courses: string[];
  joinedAt: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const mockStudents = [
  {
    id: 1,
    name: "Alex Chen",
    email: "alex.chen@university.edu",
    course: "CS 101",
    progress: 85,
    trend: "up",
    queries: 142,
    lastActive: "2 hours ago",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@university.edu",
    course: "CS 101",
    progress: 72,
    trend: "up",
    queries: 98,
    lastActive: "5 hours ago",
  },
  {
    id: 3,
    name: "Michael Park",
    email: "m.park@university.edu",
    course: "ML 301",
    progress: 45,
    trend: "down",
    queries: 67,
    lastActive: "1 day ago",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.d@university.edu",
    course: "MATH 201",
    progress: 91,
    trend: "stable",
    queries: 203,
    lastActive: "30 mins ago",
  },
  {
    id: 5,
    name: "James Wilson",
    email: "j.wilson@university.edu",
    course: "CS 101",
    progress: 58,
    trend: "up",
    queries: 89,
    lastActive: "3 hours ago",
  },
];

export default function FacultyStudentsPage() {
  const { data: session } = useSession();
  const courses = useCourseStore((s) => s.courses);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = selectedCourse !== "all" 
        ? `/api/faculty/students?courseId=${selectedCourse}`
        : "/api/faculty/students";
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch students");
      }
      
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error(error.message || "Failed to fetch students");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (session) {
      fetchStudents();
    }
  }, [session, fetchStudents]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getCourseNames = (courseIds: string[]) => {
    return courseIds
      .map((id) => courses.find((c) => c.id === id)?.code)
      .filter(Boolean)
      .join(", ");
  };
  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Student Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track student progress and engagement
            </p>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{students.length}</div>
                <div className="text-xs text-muted-foreground">Total Students</div>
              </div>
              {selectedCourse !== "all" && (
                <div className="text-center">
                  <div className="text-2xl font-bold">{filteredStudents.length}</div>
                  <div className="text-xs text-muted-foreground">In Course</div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Students will appear here once they enroll in your courses"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="space-y-3"
          >
            {filteredStudents.map((student) => (
              <motion.div key={student.id} variants={fadeInUp}>
                <Card className="glass border-border/50 hover:glow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="gradient-primary text-white">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{student.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-6">
                        <div className="text-center min-w-[100px]">
                          <div className="text-sm font-medium">
                            {student.courses.length}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.courses.length === 1 ? "Course" : "Courses"}
                          </div>
                        </div>
                        {student.courses.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {student.courses.slice(0, 2).map((courseId) => {
                              const course = courses.find((c) => c.id === courseId);
                              return course ? (
                                <Badge key={courseId} variant="outline" className="text-xs">
                                  {course.code}
                                </Badge>
                              ) : null;
                            })}
                            {student.courses.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{student.courses.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground hidden md:block min-w-[100px] text-right">
                        Joined {formatDate(student.joinedAt)}
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
