"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  FileText,
  Zap,
  Target,
  Calendar,
  Activity,
  BookOpen,
  Brain,
  Flame,
  Award,
  ChevronDown,
  Loader2,
  RefreshCw,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourseStore } from "@/lib/store";

interface AnalyticsData {
  overview: {
    totalQueries: number;
    totalDocumentsAccessed: number;
    totalTimeSpent: number;
    avgResponseTime: number;
    avgQueryLength: number;
    satisfactionRate: number | null;
    currentStreak: number;
    longestStreak: number;
  };
  charts: {
    queriesByDay: Array<{ date: string; count: number }>;
    topDocuments: Array<{ name: string; count: number }>;
    hourlyActivity: Array<{ hour: number; count: number }>;
    weeklyActivity: Array<{ day: string; count: number }>;
    velocityData: Array<{ week: string; count: number }>;
  };
  activity: {
    byCourse: Array<{
      courseId: string;
      queryCount: number;
      documentsAccessed: number;
      timeSpent: number;
      lastActive: Date;
    }>;
    recent: Array<{
      id: string;
      query: string;
      courseId: string;
      documentsUsed: string[];
      responseTime: number;
      createdAt: Date;
    }>;
  };
  savedContent: {
    total: number;
    byType: Record<string, number>;
  };
  timeRange: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color = "primary",
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <Card className="feature-box p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4" />
            <span className="text-xs uppercase font-bold tracking-wider">{label}</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold font-serif">{value}</p>
            {subtitle && (
              <p className="text-xs">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            {trend === "up" && <ArrowUp className="h-3 w-3" />}
            {trend === "down" && <ArrowDown className="h-3 w-3" />}
            {trend === "neutral" && <Minus className="h-3 w-3" />}
          </div>
        )}
      </div>
    </Card>
  );
}

function SimpleBarChart({ data, maxValue }: { data: Array<{ label: string; value: number }>; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[200px]">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.value / maxValue) * 80,
  }));

  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div className="relative h-48 w-full">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L 100 100 L 0 100 Z`}
          fill="url(#lineGradient)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1"
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-2">
        {data.map((d, i) => (
          i % Math.ceil(data.length / 6) === 0 && (
            <span key={i}>{d.label}</span>
          )
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const courses = useCourseStore((s) => s.courses);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ timeRange });
      if (selectedCourse !== "all") {
        params.append("courseId", selectedCourse);
      }

      const res = await fetch(`/api/student/analytics?${params}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCourse, timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen pt-14 pb-20 md:pb-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen pt-14 pb-20 md:pb-6 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    );
  }

  const maxDocCount = Math.max(...data.charts.topDocuments.map(d => d.count), 1);
  const maxHourlyCount = Math.max(...data.charts.hourlyActivity.map(d => d.count), 1);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              LEARNING ANALYTICS
            </h1>
            <p className="text-sm mt-1">
              Track your progress and learning patterns
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCourse} onValueChange={(value) => setSelectedCourse(value || "all")}>
              <SelectTrigger className="w-[180px] h-9">
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

            <Select value={timeRange} onValueChange={(value) => setTimeRange(value || "7d")}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={Brain}
            label="Total Queries"
            value={data.overview.totalQueries}
            subtitle={`${data.overview.avgQueryLength} chars avg`}
            trend="up"
          />
          <StatCard
            icon={FileText}
            label="Documents Accessed"
            value={data.overview.totalDocumentsAccessed}
            subtitle="Unique materials"
          />
          <StatCard
            icon={Clock}
            label="Time Spent"
            value={`${Math.floor(data.overview.totalTimeSpent / 60)}h ${data.overview.totalTimeSpent % 60}m`}
            subtitle="Learning time"
            trend="up"
          />
          <StatCard
            icon={Zap}
            label="Avg Response"
            value={`${(data.overview.avgResponseTime / 1000).toFixed(1)}s`}
            subtitle="Response time"
          />
        </motion.div>

        {/* Streak Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="feature-box p-4">
            <div className="flex items-center gap-3">
              <Flame className="h-6 w-6" />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider">Current Streak</p>
                <p className="text-2xl font-bold font-serif">{data.overview.currentStreak} days</p>
              </div>
            </div>
          </Card>

          <Card className="feature-box p-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6" />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider">Longest Streak</p>
                <p className="text-2xl font-bold font-serif">{data.overview.longestStreak} days</p>
              </div>
            </div>
          </Card>

          <Card className="feature-box p-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6" />
              <div>
                <p className="text-xs uppercase font-bold tracking-wider">Saved Content</p>
                <p className="text-2xl font-bold font-serif">{data.savedContent.total}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Charts Section */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="activity" className="gap-1">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="patterns" className="gap-1">
              <Calendar className="h-3 w-3" />
              <span className="hidden sm:inline">Patterns</span>
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Recent</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Daily Activity
                </h3>
                <LineChart
                  data={data.charts.queriesByDay.slice(-14).map(d => ({
                    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: d.count,
                  }))}
                />
              </Card>

              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Weekly Pattern
                </h3>
                <SimpleBarChart
                  data={data.charts.weeklyActivity.map(d => ({
                    label: d.day,
                    value: d.count,
                  }))}
                  maxValue={Math.max(...data.charts.weeklyActivity.map(d => d.count), 1)}
                />
              </Card>
            </div>

            <Card className="feature-box p-4">
              <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Peak Learning Hours
              </h3>
              <div className="grid grid-cols-12 gap-1">
                {data.charts.hourlyActivity.map((item) => (
                  <div key={item.hour} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-sm hover:bg-primary/40 transition-colors relative group"
                      style={{
                        height: `${Math.max((item.count / maxHourlyCount) * 80, 4)}px`,
                      }}
                      title={`${item.hour}:00 - ${item.count} queries`}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {item.hour}:00<br/>{item.count} queries
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {item.hour % 6 === 0 ? item.hour : ''}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="feature-box p-4">
              <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Most Accessed Documents
              </h3>
              {data.charts.topDocuments.length > 0 ? (
                <SimpleBarChart
                  data={data.charts.topDocuments.map(d => ({
                    label: d.name,
                    value: d.count,
                  }))}
                  maxValue={maxDocCount}
                />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No document access data yet
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-4">Saved Content by Type</h3>
                <div className="space-y-2">
                  {Object.entries(data.savedContent.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(data.savedContent.byType).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No saved content yet
                    </p>
                  )}
                </div>
              </Card>

              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-4">Activity by Course</h3>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {data.activity.byCourse.map((activity) => {
                      const course = courses.find(c => c.id === activity.courseId);
                      return (
                        <div key={activity.courseId} className="p-3 rounded-lg bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{course?.code || 'Unknown'}</span>
                            <Badge variant="outline">{activity.queryCount} queries</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>📄 {activity.documentsAccessed} docs</div>
                            <div>⏱️ {activity.timeSpent}m</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <Card className="feature-box p-4">
              <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Learning Velocity (Queries per Week)
              </h3>
              <LineChart
                data={data.charts.velocityData.slice(-12).map(d => ({
                  label: new Date(d.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  value: d.count,
                }))}
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-2">Learning Consistency</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {data.charts.queriesByDay.length > 0 
                      ? Math.round((data.charts.queriesByDay.filter(d => d.count > 0).length / data.charts.queriesByDay.length) * 100)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Active days</p>
                </div>
              </Card>

              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-2">Avg Queries/Day</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {data.charts.queriesByDay.length > 0
                      ? (data.overview.totalQueries / data.charts.queriesByDay.length).toFixed(1)
                      : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Questions per day</p>
                </div>
              </Card>

              <Card className="feature-box p-4">
                <h3 className="text-sm uppercase font-bold tracking-wider mb-2">Most Active Day</h3>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {data.charts.weeklyActivity.reduce((max, curr) => 
                      curr.count > max.count ? curr : max, 
                      data.charts.weeklyActivity[0]
                    )?.day || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Peak activity</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card className="feature-box p-4">
              <h3 className="text-sm uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {data.activity.recent.map((activity) => {
                    const course = courses.find(c => c.id === activity.courseId);
                    return (
                      <div key={activity.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{activity.query}</p>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {(activity.responseTime / 1000).toFixed(1)}s
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{course?.code || 'Unknown'}</span>
                          <span>•</span>
                          <span>{activity.documentsUsed.length} docs</span>
                          <span>•</span>
                          <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                  {data.activity.recent.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No recent activity
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
