"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  RotateCcw,
  Lightbulb,
  Brain,
  Zap,
  Target,
  CalendarDays,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function FlashcardView() {
  return (
    <div className="text-center py-20">
      <RotateCcw className="h-16 w-16 text-primary/50 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Flashcards Coming Soon</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        We're building AI-powered flashcards that automatically generate from your course materials.
      </p>
    </div>
  );
}

function QuizView() {
  return (
    <div className="text-center py-20">
      <Zap className="h-16 w-16 text-primary/50 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Quizzes Coming Soon</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Interactive quizzes will be generated from your documents to test your understanding.
      </p>
    </div>
  );
}

function StudyPlanView() {
  return (
    <div className="text-center py-20">
      <CalendarDays className="h-16 w-16 text-primary/50 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Study Plans Coming Soon</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Personalized study plans will help you organize your learning schedule effectively.
      </p>
    </div>
  );
}

export default function LearnPage() {
  const [difficulty, setDifficulty] = useState([50]);
  const [eli5, setEli5] = useState(false);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Learning Playground
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convert your notes into interactive study tools
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl glass flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <span className="text-sm">Explain like I&apos;m 5</span>
            <Switch checked={eli5} onCheckedChange={setEli5} />
          </div>
          <div className="flex items-center gap-3 flex-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Beginner</span>
            <Slider
              value={difficulty}
              onValueChange={(value) => setDifficulty(Array.isArray(value) ? value : [value])}
              max={100}
              step={1}
              className="flex-1 max-w-[200px]"
            />
            <span className="text-xs text-muted-foreground">Advanced</span>
          </div>
        </motion.div>

        <Tabs defaultValue="flashcards" className="space-y-6">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="flashcards" className="gap-1 text-xs">
              <RotateCcw className="h-3 w-3" /> Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1 text-xs">
              <Zap className="h-3 w-3" /> Quiz
            </TabsTrigger>
            <TabsTrigger value="studyplan" className="gap-1 text-xs">
              <CalendarDays className="h-3 w-3" /> Study Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards">
            <FlashcardView />
          </TabsContent>
          <TabsContent value="quiz">
            <QuizView />
          </TabsContent>
          <TabsContent value="studyplan">
            <StudyPlanView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
