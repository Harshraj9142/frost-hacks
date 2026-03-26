"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { mockAnalyticsData } from "@/lib/mock-data";
import { useCourseStore } from "@/lib/store";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function AnalyticsPage() {
  const courses = useCourseStore((s) => s.courses);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Understand how your students are learning
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="cs101">
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="7d">
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Download className="h-3 w-3" /> Export
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Query Frequency Chart */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate">
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Query Frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockAnalyticsData.queryFrequency}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(20,20,30,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="queries" radius={[6, 6, 0, 0]}>
                        {mockAnalyticsData.queryFrequency.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`oklch(0.65 0.22 ${265 + index * 5})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Topic Difficulty Heatmap */}
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Topic Difficulty Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mockAnalyticsData.topicDifficulty.map((topic, i) => {
                    const intensity = topic.difficulty;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-xl relative overflow-hidden"
                        style={{
                          background: `rgba(${Math.round(
                            intensity * 255
                          )}, ${Math.round(
                            (1 - intensity) * 100
                          )}, 50, ${intensity * 0.2})`,
                          border: `1px solid rgba(${Math.round(
                            intensity * 255
                          )}, ${Math.round(
                            (1 - intensity) * 100
                          )}, 50, ${intensity * 0.3})`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {topic.topic}
                          </span>
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: `rgba(${Math.round(
                                intensity * 255
                              )}, ${Math.round(
                                (1 - intensity) * 150 + 100
                              )}, 100, 1)`,
                            }}
                          >
                            {Math.round(intensity * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {topic.queries} queries
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Student Questions Table */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Recent Student Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                        Question
                      </th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                        Topic
                      </th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                        Confidence
                      </th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAnalyticsData.studentQuestions.map((q) => (
                      <tr
                        key={q.id}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium">{q.student}</td>
                        <td className="py-3 px-4 text-muted-foreground max-w-[300px] truncate">
                          {q.question}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">
                            {q.topic}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              q.confidence === "high"
                                ? "text-emerald-400 border-emerald-400/30"
                                : q.confidence === "medium"
                                ? "text-amber-400 border-amber-400/30"
                                : "text-red-400 border-red-400/30"
                            }`}
                          >
                            {q.confidence}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {q.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
