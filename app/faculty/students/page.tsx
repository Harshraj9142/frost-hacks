"use client";

import { motion } from "framer-motion";
import { Search, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="space-y-3"
        >
          {mockStudents.map((student) => (
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
                        {student.trend === "up" && (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        )}
                        {student.trend === "down" && (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        {student.trend === "stable" && (
                          <Minus className="h-3 w-3 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{student.progress}%</div>
                        <div className="text-xs text-muted-foreground">Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{student.queries}</div>
                        <div className="text-xs text-muted-foreground">Queries</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {student.course}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground hidden md:block">
                      {student.lastActive}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
