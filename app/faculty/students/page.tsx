"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Loader2, 
  Users,
  Mail,
  Download,
  Eye,
  Clock,
  MessageSquare,
  BookOpen,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email: string;
  courses: string[];
  joinedAt: string;
  queryCount?: number;
  lastActive?: string;
  timeSpent?: number;
}

interface StudentDetails {
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    joinedAt: string;
    courses: Array<{
      id: string;
      code: string;
      name: string;
      color: string;
    }>;
  };
  stats: {
    totalQueries: number;
    totalTimeSpent: number;
    avgResponseTime: number;
    coursesEnrolled: number;
  };
  activities: Array<{
    courseId: string;
    queryCount: number;
    lastActive: string;
    documentsAccessed: number;
    timeSpent: number;
  }>;
  recentQueries: Array<{
    id: string;
    query: string;
    courseId: string;
    createdAt: string;
    responseTime: number;
    satisfied: boolean | null;
  }>;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export default function FacultyStudentsPage() {
  const { data: session } = useSession();
  const courses = useCourseStore((s) => s.courses);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchStudentDetails = useCallback(async (studentId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/faculty/students?studentId=${studentId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch student details");
      }
      
      setStudentDetails(data);
    } catch (error: any) {
      console.error("Error fetching student details:", error);
      toast.error(error.message || "Failed to fetch student details");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const handleViewStudent = (studentId: string) => {
    setSelectedStudent(studentId);
    fetchStudentDetails(studentId);
  };

  const handleExportStudents = () => {
    const csv = [
      ["Name", "Email", "Courses", "Queries", "Last Active", "Time Spent (min)"],
      ...filteredStudents.map((s) => [
        s.name,
        s.email,
        s.courses.length.toString(),
        s.queryCount?.toString() || "0",
        formatDate(s.lastActive || s.joinedAt),
        s.timeSpent?.toString() || "0",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Student data exported");
  };

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
    return formatDate(dateString);
  };

  const getCourseById = (courseId: string) => {
    return courses.find((c) => c.id === courseId);
  };

  const getEngagementLevel = (queryCount: number) => {
    if (queryCount >= 100) return { label: "High", color: "bg-green-500" };
    if (queryCount >= 50) return { label: "Medium", color: "bg-yellow-500" };
    if (queryCount > 0) return { label: "Low", color: "bg-orange-500" };
    return { label: "None", color: "bg-gray-500" };
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

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
          <div className="flex items-center gap-3">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStudents}
              disabled={filteredStudents.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
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
            {filteredStudents.map((student) => {
              const engagement = getEngagementLevel(student.queryCount || 0);
              return (
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
                            <div className={`w-2 h-2 rounded-full ${engagement.color}`} title={`${engagement.label} engagement`} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {student.email}
                          </p>
                        </div>
                        <div className="hidden lg:flex items-center gap-6">
                          <div className="text-center min-w-[80px]">
                            <div className="text-sm font-medium">
                              {student.queryCount || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Queries
                            </div>
                          </div>
                          <div className="text-center min-w-[80px]">
                            <div className="text-sm font-medium">
                              {student.courses.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.courses.length === 1 ? "Course" : "Courses"}
                            </div>
                          </div>
                          {student.timeSpent !== undefined && student.timeSpent > 0 && (
                            <div className="text-center min-w-[80px]">
                              <div className="text-sm font-medium">
                                {formatMinutes(student.timeSpent)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Time Spent
                              </div>
                            </div>
                          )}
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
                        <div className="hidden md:flex flex-col items-end min-w-[120px]">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(student.lastActive || student.joinedAt)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Student Details Dialog */}
      <Dialog open={selectedStudent !== null} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View detailed information about student activity and engagement
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : studentDetails ? (
            <div className="space-y-6">
              {/* Student Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="gradient-primary text-white text-xl">
                    {studentDetails.student.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{studentDetails.student.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-3 w-3" />
                    {studentDetails.student.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {formatDate(studentDetails.student.joinedAt)}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Queries</span>
                    </div>
                    <div className="text-2xl font-bold">{studentDetails.stats.totalQueries}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Time Spent</span>
                    </div>
                    <div className="text-2xl font-bold">{formatMinutes(studentDetails.stats.totalTimeSpent)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Avg Response</span>
                    </div>
                    <div className="text-2xl font-bold">{studentDetails.stats.avgResponseTime.toFixed(1)}s</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Courses</span>
                    </div>
                    <div className="text-2xl font-bold">{studentDetails.stats.coursesEnrolled}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="courses" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="courses">Courses</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="queries">Recent Queries</TabsTrigger>
                </TabsList>

                <TabsContent value="courses" className="space-y-3 mt-4">
                  {studentDetails.student.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No courses enrolled
                    </p>
                  ) : (
                    studentDetails.student.courses.map((course) => {
                      const activity = studentDetails.activities.find(a => a.courseId === course.id);
                      return (
                        <Card key={course.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: course.color }}
                                  />
                                  <h4 className="font-medium">{course.code}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{course.name}</p>
                              </div>
                              {activity && (
                                <div className="text-right">
                                  <div className="text-sm font-medium">{activity.queryCount} queries</div>
                                  <div className="text-xs text-muted-foreground">
                                    {activity.documentsAccessed} docs accessed
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-3 mt-4">
                  {studentDetails.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity recorded
                    </p>
                  ) : (
                    studentDetails.activities.map((activity, idx) => {
                      const course = getCourseById(activity.courseId);
                      return (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{course?.code || "Unknown Course"}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last active: {formatTimeAgo(activity.lastActive)}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-sm">{activity.queryCount} queries</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatMinutes(activity.timeSpent)} spent
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="queries" className="space-y-3 mt-4">
                  {studentDetails.recentQueries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No queries yet
                    </p>
                  ) : (
                    studentDetails.recentQueries.map((query) => {
                      const course = getCourseById(query.courseId);
                      return (
                        <Card key={query.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium mb-2">{query.query}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{course?.code || "Unknown"}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(query.createdAt)}</span>
                                  <span>•</span>
                                  <span>{query.responseTime}ms</span>
                                </div>
                              </div>
                              {query.satisfied !== null && (
                                <Badge variant={query.satisfied ? "default" : "destructive"}>
                                  {query.satisfied ? "Satisfied" : "Not Satisfied"}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
