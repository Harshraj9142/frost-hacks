"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, AlertTriangle, TrendingDown, Users, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AnalyticsHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger className="border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2">
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">
            Analytics Guide
          </DialogTitle>
          <DialogDescription>
            Understanding your analytics dashboard metrics
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Topic Confusion */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-bold">Topic Confusion Heatmap</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Identifies topics causing the most confusion among students.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border-2 border-foreground">
                  LOW
                </Badge>
                <span>0-30% confusion - Concept is well understood</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="border-2 border-foreground">
                  MEDIUM
                </Badge>
                <span>31-60% confusion - May need review</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="border-2 border-foreground">
                  HIGH
                </Badge>
                <span>61-100% confusion - Requires immediate attention</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5" />
              <h3 className="text-lg font-bold">Weak Concepts</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Specific concepts students find challenging, ranked by weakness score.
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-bold">Weakness Score:</span> Composite metric based on:
              </div>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>Unsatisfied rate (70% weight)</li>
                <li>Average response time (30% weight)</li>
              </ul>
              <div className="mt-3">
                <span className="font-bold">Severity Levels:</span>
              </div>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>HIGH: Score 61-100 - Intervention needed</li>
                <li>MEDIUM: Score 31-60 - Provide additional resources</li>
                <li>LOW: Score 0-30 - Monitor progress</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5" />
              <h3 className="text-lg font-bold">Topic Clustering</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Questions grouped by category to understand learning patterns.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 border border-foreground/20 bg-muted/50">
                <span className="font-bold">Algorithms</span>
                <p className="text-xs text-muted-foreground">Sorting, searching, design</p>
              </div>
              <div className="p-2 border border-foreground/20 bg-muted/50">
                <span className="font-bold">Data Structures</span>
                <p className="text-xs text-muted-foreground">Arrays, trees, graphs</p>
              </div>
              <div className="p-2 border border-foreground/20 bg-muted/50">
                <span className="font-bold">Complexity</span>
                <p className="text-xs text-muted-foreground">Big O, time/space</p>
              </div>
              <div className="p-2 border border-foreground/20 bg-muted/50">
                <span className="font-bold">Implementation</span>
                <p className="text-xs text-muted-foreground">Coding, building</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-bold">Student Tracking</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Individual student engagement and performance metrics.
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-bold">Engagement Levels:</span>
              </div>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>HIGH: &gt;5 queries/day, &gt;70% satisfaction</li>
                <li>MEDIUM: 2-5 queries/day, &gt;50% satisfaction</li>
                <li>LOW: &lt;2 queries/day or &lt;50% satisfaction</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="bg-muted/50 p-4 border-2 border-foreground/20">
              <h4 className="font-bold mb-2">💡 Best Practices</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Check analytics weekly to stay informed</li>
                <li>• Address high confusion topics immediately</li>
                <li>• Use student tracking for targeted interventions</li>
                <li>• Compare time periods to measure improvement</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
