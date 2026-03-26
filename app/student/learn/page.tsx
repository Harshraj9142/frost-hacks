"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  RotateCcw,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Brain,
  Zap,
  Shuffle,
  GraduationCap,
  Clock,
  Target,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  mockFlashcards,
  mockQuizQuestions,
  mockStudyPlan,
} from "@/lib/mock-data";

function FlashcardView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const cards = mockFlashcards;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {cards.length}
        </span>
        <Button variant="outline" size="sm" className="gap-1 text-xs">
          <Shuffle className="h-3 w-3" /> Shuffle
        </Button>
      </div>

      <div
        className="relative h-[300px] cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${isFlipped}`}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center ${
              isFlipped
                ? "glass-strong border border-primary/20"
                : "glass border border-border/50"
            }`}
          >
            <Badge variant="outline" className="mb-4 text-[10px]">
              {cards[currentIndex].topic}
            </Badge>
            <p className="text-lg leading-relaxed">
              {isFlipped
                ? cards[currentIndex].back
                : cards[currentIndex].front}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              {isFlipped ? "Answer" : "Click to reveal"}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setCurrentIndex(
              (i) => (i - 1 + cards.length) % cards.length
            );
            setIsFlipped(false);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="gap-1 text-red-400 border-red-400/30 hover:bg-red-400/10"
          onClick={() => {
            setCurrentIndex((i) => (i + 1) % cards.length);
            setIsFlipped(false);
          }}
        >
          <X className="h-4 w-4" /> Still Learning
        </Button>
        <Button
          className="gap-1 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30"
          variant="outline"
          onClick={() => {
            setCurrentIndex((i) => (i + 1) % cards.length);
            setIsFlipped(false);
          }}
        >
          <Check className="h-4 w-4" /> Got It
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setCurrentIndex((i) => (i + 1) % cards.length);
            setIsFlipped(false);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function QuizView() {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const q = mockQuizQuestions[currentQ];

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
    if (index === q.correctIndex) setScore((s) => s + 1);
  };

  const nextQuestion = () => {
    setCurrentQ((c) => (c + 1) % mockQuizQuestions.length);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentQ + 1} of {mockQuizQuestions.length}
        </span>
        <Badge variant="outline" className="text-primary">
          Score: {score}/{mockQuizQuestions.length}
        </Badge>
      </div>

      <Card className="glass border-border/50">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-6">{q.question}</h3>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let styles = "bg-muted/30 hover:bg-muted/50 border-border/50";
              if (showResult) {
                if (i === q.correctIndex)
                  styles =
                    "bg-emerald-400/10 border-emerald-400/30 text-emerald-300";
                else if (i === selectedAnswer)
                  styles = "bg-red-400/10 border-red-400/30 text-red-300";
              }

              return (
                <motion.button
                  key={i}
                  whileHover={!showResult ? { scale: 1.01 } : {}}
                  whileTap={!showResult ? { scale: 0.99 } : {}}
                  onClick={() => handleSelect(i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${styles}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10"
            >
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">Explanation: </span>
                {q.explanation}
              </p>
              <Button
                size="sm"
                className="mt-3 gradient-primary text-white border-0"
                onClick={nextQuestion}
              >
                Next Question
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudyPlanView() {
  return (
    <div className="space-y-4">
      {mockStudyPlan.map((day, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="glass border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{day.day}</span>
              </div>
              <div className="space-y-2">
                {day.tasks.map((task, j) => (
                  <div
                    key={j}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      task.completed ? "bg-emerald-400/5" : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        task.completed
                          ? "border-emerald-400 bg-emerald-400"
                          : "border-border"
                      }`}
                    >
                      {task.completed && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          task.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {task.duration}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
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
