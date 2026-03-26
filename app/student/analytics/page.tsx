"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useCourseStore } from "@/lib/store";

export default function AnalyticsPage() {
  const courses = useCourseStore((s) => s.courses);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 py-20"
        >
          <BarChart3 className="h-16 w-16 text-primary/50" />
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Analytics Coming Soon</h1>
            <p className="text-sm text-muted-foreground max-w-md">
              We're building powerful analytics to help you understand student learning patterns, 
              topic difficulty, and engagement metrics.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
