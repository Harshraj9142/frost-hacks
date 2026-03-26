"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mockAnalyticsData } from "@/lib/mock-data";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function FacultyAnalyticsPage() {
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

        <motion.div
          initial="initial"
          animate="animate"
          variants={stagger}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Queries",
                value: "2,847",
                change: "+12%",
                icon: MessageSquare,
                color: "text-primary",
              },
              {
                label: "Active Students",
                value: "156",
                change: "+5%",
                icon: Users,
                color: "text-emerald-400",
              },
              {
                label: "Avg. Response Time",
                value: "1.2s",
                change: "-8%",
                icon: TrendingUp,
                color: "text-cyan-400",
              },
              {
                label: "Difficult Topics",
                value: "8",
                change: "+2",
                icon: AlertTriangle,
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
                  Topic Difficulty Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalyticsData.topicDifficulty
                    .sort((a, b) => b.difficulty - a.difficulty)
                    .map((topic, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{topic.topic}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {topic.queries} queries
                            </span>
                            <span className="text-xs text-amber-400 font-medium">
                              {Math.round(topic.difficulty * 100)}%
                            </span>
                          </div>
                        </div>
                        <Progress value={topic.difficulty * 100} className="h-2" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Query Volume by Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {[45, 62, 78, 85, 92, 88, 75, 68, 82, 95, 87, 72].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {i + 8}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="glass border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Student Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Highly Engaged", value: 45, color: "bg-emerald-500" },
                      { label: "Moderately Engaged", value: 35, color: "bg-amber-500" },
                      { label: "Low Engagement", value: 20, color: "bg-red-500" },
                    ].map((segment, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{segment.label}</span>
                          <span className="text-sm font-medium">{segment.value}%</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${segment.color} rounded-full`}
                            style={{ width: `${segment.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
