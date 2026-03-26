"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  TrendingUp,
  Brain,
  Flame,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { mockTopicProgress } from "@/lib/mock-data";
import Link from "next/link";

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
  const user = session?.user;

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
              Ready to continue learning?
            </p>
          </div>
        </motion.div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="space-y-6"
        >
          <div className="grid lg:grid-cols-3 gap-4">
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Continue Learning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      title: "Binary Search Trees",
                      course: "CS 101",
                      progress: 65,
                      lastActive: "2 hours ago",
                    },
                    {
                      title: "Gradient Descent",
                      course: "ML 301",
                      progress: 40,
                      lastActive: "Yesterday",
                    },
                    {
                      title: "Eigenvalues",
                      course: "MATH 201",
                      progress: 25,
                      lastActive: "3 days ago",
                    },
                  ].map((item, i) => (
                    <Link href="/student/chat" key={i}>
                      <div className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-sm">
                              {item.title}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {item.course} • {item.lastActive}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <Progress value={item.progress} className="h-1.5" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50 h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Flame className="h-12 w-12 text-orange-400 mb-3" />
                  </motion.div>
                  <div className="text-4xl font-bold mb-1">7</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Day Streak 🔥
                  </div>
                  <div className="flex gap-1">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                          i < 5
                            ? "bg-orange-400/20 text-orange-400"
                            : i === 5
                            ? "bg-primary/20 text-primary"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Suggested for You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    "Explain the difference between DFS and BFS",
                    "How does dynamic programming differ from divide & conquer?",
                    "What makes a hash function 'good'?",
                    "Walk me through Dijkstra's algorithm",
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

            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockTopicProgress.map((topic, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{topic.topic}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            topic.status === "mastered"
                              ? "text-emerald-400 border-emerald-400/30"
                              : topic.status === "learning"
                              ? "text-amber-400 border-amber-400/30"
                              : "text-red-400 border-red-400/30"
                          }`}
                        >
                          {topic.status}
                        </Badge>
                      </div>
                      <Progress value={topic.progress} className="h-1.5" />
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
