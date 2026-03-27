"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  RotateCcw,
  Lightbulb,
  Brain,
  Zap,
  Target,
  CalendarDays,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  BookOpen,
  Clock,
  Award,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCourseStore } from "@/lib/store";
import { toast } from "sonner";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: string;
  topic: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface StudySession {
  id: number;
  title: string;
  topics: string[];
  duration: string;
  objectives: string[];
  difficulty: string;
}

interface Summary {
  title: string;
  keyPoints: string[];
  mainConcepts: string[];
  summary: string;
}

interface PracticeProblem {
  id: number;
  problem: string;
  hints: string[];
  solution: string;
  difficulty: string;
  topic: string;
}

interface SavedContent {
  id: string;
  type: string;
  data: any;
  courseId: string;
  createdAt: string;
}

export default function LearnPage() {
  const courses = useCourseStore((s) => s.courses);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Study plan state
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [loadingStudyPlan, setLoadingStudyPlan] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Practice problems state
  const [practiceProblems, setPracticeProblems] = useState<PracticeProblem[]>([]);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Concept explanation state
  const [conceptQuery, setConceptQuery] = useState("");
  const [conceptExplanation, setConceptExplanation] = useState("");
  const [loadingConcept, setLoadingConcept] = useState(false);

  // Saved content state
  const [savedContent, setSavedContent] = useState<SavedContent[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0].id);
    }
    loadSavedContent();
  }, [courses, selectedCourse]);

  const generateFlashcards = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    setLoadingFlashcards(true);
    try {
      const response = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flashcards",
          courseId: selectedCourse,
          topic: topic || undefined,
          difficulty,
          count,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setFlashcards(data.data);
      setCurrentCard(0);
      setIsFlipped(false);
      toast.success(`Generated ${data.data.length} flashcards!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate flashcards");
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const generateQuiz = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    setLoadingQuiz(true);
    try {
      const response = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz",
          courseId: selectedCourse,
          topic: topic || undefined,
          difficulty,
          count: 5,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setQuizQuestions(data.data);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizScore(0);
      setQuizCompleted(false);
      toast.success(`Generated ${data.data.length} questions!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate quiz");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const generateStudyPlan = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    setLoadingStudyPlan(true);
    try {
      const response = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "studyplan",
          courseId: selectedCourse,
          topic: topic || undefined,
          difficulty,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setStudyPlan(data.data);
      toast.success("Study plan generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate study plan");
    } finally {
      setLoadingStudyPlan(false);
    }
  };

  const generateSummary = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    setLoadingSummary(true);
    try {
      const response = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "summary",
          courseId: selectedCourse,
          topic: topic || undefined,
          difficulty,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSummary(data.data);
      toast.success("Summary generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const generatePracticeProblems = async () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    setLoadingProblems(true);
    try {
      const response = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "practice",
          courseId: selectedCourse,
          topic: topic || undefined,
          difficulty,
          count: 5,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setPracticeProblems(data.data);
      setCurrentProblem(0);
      setShowHints(false);
      setShowSolution(false);
      toast.success(`Generated ${data.data.length} practice problems!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate practice problems");
    } finally {
      setLoadingProblems(false);
    }
  };

  const explainConcept = async () => {
    if (!selectedCourse || !conceptQuery.trim()) {
      toast.error("Please enter a concept to explain");
      return;
    }

    setLoadingConcept(true);
    try {
      const response = await fetch("/api/learn/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          concept: conceptQuery,
          difficulty,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setConceptExplanation(data.explanation);
    } catch (error: any) {
      toast.error(error.message || "Failed to explain concept");
    } finally {
      setLoadingConcept(false);
    }
  };

  const saveContent = async (type: string, data: any) => {
    try {
      const response = await fetch("/api/learn/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          data,
          courseId: selectedCourse,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success("Content saved!");
      loadSavedContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to save content");
    }
  };

  const loadSavedContent = async () => {
    setLoadingSaved(true);
    try {
      const response = await fetch("/api/learn/saved");
      const data = await response.json();
      if (response.ok) {
        setSavedContent(data.saved || []);
      }
    } catch (error) {
      console.error("Failed to load saved content:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  const deleteSavedContent = async (id: string) => {
    try {
      const response = await fetch(`/api/learn/saved?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Content deleted!");
      loadSavedContent();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete content");
    }
  };

  const handleNextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === quizQuestions[currentQuestion].correctAnswer) {
      setQuizScore(quizScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI LEARNING TOOLS
          </h1>
          <p className="text-sm mt-1">
            Generate flashcards, quizzes, and study plans from your course materials
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="feature-box">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-wider">Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-wider">Topic (Optional)</Label>
                  <Input
                    placeholder="e.g., Binary Search"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-wider">Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="uppercase font-bold tracking-wider">Count</Label>
                  <Select value={count.toString()} onValueChange={(v) => setCount(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="flashcards" className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="flashcards" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <RotateCcw className="h-3 w-3" /> Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <Zap className="h-3 w-3" /> Quiz
            </TabsTrigger>
            <TabsTrigger value="practice" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <Target className="h-3 w-3" /> Practice
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <BookOpen className="h-3 w-3" /> Summary
            </TabsTrigger>
            <TabsTrigger value="explain" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <Lightbulb className="h-3 w-3" /> Explain
            </TabsTrigger>
            <TabsTrigger value="studyplan" className="gap-1 text-xs uppercase font-bold tracking-wider">
              <CalendarDays className="h-3 w-3" /> Plan
            </TabsTrigger>
          </TabsList>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards">
            <div className="space-y-6">
              {flashcards.length === 0 ? (
                <Card className="feature-box">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <RotateCcw className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-bold font-serif mb-2 uppercase tracking-wider">Generate Flashcards</h3>
                    <p className="text-sm max-w-md mx-auto text-center mb-6">
                      AI will create flashcards from your course materials to help you study
                    </p>
                    <Button
                      onClick={generateFlashcards}
                      disabled={loadingFlashcards || !selectedCourse}
                      className="gap-2"
                    >
                      {loadingFlashcards ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Generate Flashcards
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Card {currentCard + 1} of {flashcards.length}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateFlashcards}
                      disabled={loadingFlashcards}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>

                  <Card
                    className="feature-box cursor-pointer min-h-[300px] flex items-center justify-center"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <CardContent className="p-8 text-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isFlipped ? "answer" : "question"}
                          initial={{ rotateY: 90, opacity: 0 }}
                          animate={{ rotateY: 0, opacity: 1 }}
                          exit={{ rotateY: -90, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {!isFlipped ? (
                            <div>
                              <Badge className="mb-4">Question</Badge>
                              <p className="text-xl font-medium">
                                {flashcards[currentCard].question}
                              </p>
                              <p className="text-xs text-muted-foreground mt-4">
                                Click to reveal answer
                              </p>
                            </div>
                          ) : (
                            <div>
                              <Badge variant="secondary" className="mb-4">
                                Answer
                              </Badge>
                              <p className="text-lg">
                                {flashcards[currentCard].answer}
                              </p>
                              <div className="flex items-center justify-center gap-2 mt-4">
                                <Badge variant="outline" className="text-xs">
                                  {flashcards[currentCard].difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {flashcards[currentCard].topic}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={handlePrevCard}
                      disabled={currentCard === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Progress
                      value={((currentCard + 1) / flashcards.length) * 100}
                      className="w-1/3"
                    />
                    <Button
                      variant="outline"
                      onClick={handleNextCard}
                      disabled={currentCard === flashcards.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz">
            <div className="space-y-6">
              {quizQuestions.length === 0 ? (
                <Card className="feature-box">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Zap className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-bold font-serif mb-2 uppercase tracking-wider">Generate Quiz</h3>
                    <p className="text-sm max-w-md mx-auto text-center mb-6">
                      Test your knowledge with AI-generated multiple choice questions
                    </p>
                    <Button
                      onClick={generateQuiz}
                      disabled={loadingQuiz || !selectedCourse}
                      className="gap-2"
                    >
                      {loadingQuiz ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : quizCompleted ? (
                <Card className="feature-box">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Award className="h-16 w-16 mb-4" />
                    <h3 className="text-2xl font-bold font-serif mb-2 uppercase tracking-wider">Quiz Complete!</h3>
                    <p className="text-4xl font-bold font-serif mb-4">
                      {quizScore} / {quizQuestions.length}
                    </p>
                    <p className="text-sm mb-6">
                      {Math.round((quizScore / quizQuestions.length) * 100)}% correct
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={resetQuiz} variant="outline">
                        Review Answers
                      </Button>
                      <Button onClick={generateQuiz} disabled={loadingQuiz}>
                        New Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Question {currentQuestion + 1} of {quizQuestions.length}
                    </div>
                    <div className="text-sm font-medium">
                      Score: {quizScore} / {quizQuestions.length}
                    </div>
                  </div>

                  <Card className="feature-box">
                    <CardHeader>
                      <CardTitle className="text-lg font-serif">
                        {quizQuestions[currentQuestion].question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {quizQuestions[currentQuestion].options.map((option, idx) => {
                        const isCorrect =
                          idx === quizQuestions[currentQuestion].correctAnswer;
                        const isSelected = idx === selectedAnswer;
                        const showResult = showExplanation;

                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            className={`w-full justify-start text-left h-auto py-3 ${
                              showResult && isCorrect
                                ? "border-[3px]"
                                : showResult && isSelected && !isCorrect
                                ? "border-[3px]"
                                : ""
                            }`}
                            onClick={() => handleAnswerSelect(idx)}
                            disabled={showExplanation}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center">
                                {showResult && isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                {!showResult && String.fromCharCode(65 + idx)}
                              </div>
                              <span className="flex-1">{option}</span>
                            </div>
                          </Button>
                        );
                      })}

                      {showExplanation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-[3px] border-foreground"
                        >
                          <p className="text-sm font-bold uppercase tracking-wider mb-2">Explanation:</p>
                          <p className="text-sm">
                            {quizQuestions[currentQuestion].explanation}
                          </p>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>

                  {showExplanation && (
                    <div className="flex justify-end">
                      <Button onClick={handleNextQuestion}>
                        {currentQuestion === quizQuestions.length - 1
                          ? "Finish Quiz"
                          : "Next Question"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Practice Problems Tab */}
          <TabsContent value="practice">
            <div className="space-y-6">
              {practiceProblems.length === 0 ? (
                <Card className="glass border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <Target className="h-16 w-16 text-primary/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Generate Practice Problems</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto text-center mb-6">
                      Get hands-on practice with problems generated from your course materials
                    </p>
                    <Button
                      onClick={generatePracticeProblems}
                      disabled={loadingProblems || !selectedCourse}
                      className="gap-2"
                    >
                      {loadingProblems ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Generate Problems
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Problem {currentProblem + 1} of {practiceProblems.length}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generatePracticeProblems}
                      disabled={loadingProblems}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      New Problems
                    </Button>
                  </div>

                  <Card className="glass border-border/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {practiceProblems[currentProblem].problem}
                        </CardTitle>
                        <Badge variant="outline">
                          {practiceProblems[currentProblem].difficulty}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="w-fit mt-2">
                        {practiceProblems[currentProblem].topic}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowHints(!showHints)}
                          className="w-full"
                        >
                          <Lightbulb className="h-4 w-4 mr-2" />
                          {showHints ? "Hide Hints" : "Show Hints"}
                        </Button>

                        {showHints && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-2"
                          >
                            {practiceProblems[currentProblem].hints.map((hint, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                              >
                                <p className="text-sm flex items-start gap-2">
                                  <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                  {hint}
                                </p>
                              </div>
                            ))}
                          </motion.div>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => setShowSolution(!showSolution)}
                          className="w-full"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {showSolution ? "Hide Solution" : "Show Solution"}
                        </Button>

                        {showSolution && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                          >
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              Solution:
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {practiceProblems[currentProblem].solution}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentProblem > 0) {
                          setCurrentProblem(currentProblem - 1);
                          setShowHints(false);
                          setShowSolution(false);
                        }
                      }}
                      disabled={currentProblem === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Progress
                      value={((currentProblem + 1) / practiceProblems.length) * 100}
                      className="w-1/3"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentProblem < practiceProblems.length - 1) {
                          setCurrentProblem(currentProblem + 1);
                          setShowHints(false);
                          setShowSolution(false);
                        }
                      }}
                      disabled={currentProblem === practiceProblems.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="space-y-6">
              {!summary ? (
                <Card className="glass border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <BookOpen className="h-16 w-16 text-primary/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Generate Summary</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto text-center mb-6">
                      Get a concise summary of key concepts from your course materials
                    </p>
                    <Button
                      onClick={generateSummary}
                      disabled={loadingSummary || !selectedCourse}
                      className="gap-2"
                    >
                      {loadingSummary ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{summary.title}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveContent("summary", summary)}
                        className="gap-2"
                      >
                        <BookOpen className="h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateSummary}
                        disabled={loadingSummary}
                        className="gap-2"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base">Key Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {summary.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base">Main Concepts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {summary.mainConcepts.map((concept, idx) => (
                          <Badge key={idx} variant="secondary">
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base">Detailed Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {summary.summary}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* Explain Concept Tab */}
          <TabsContent value="explain">
            <div className="space-y-6">
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Ask About Any Concept
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., What is recursion?"
                      value={conceptQuery}
                      onChange={(e) => setConceptQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loadingConcept) {
                          explainConcept();
                        }
                      }}
                    />
                    <Button
                      onClick={explainConcept}
                      disabled={loadingConcept || !conceptQuery.trim() || !selectedCourse}
                    >
                      {loadingConcept ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Explain"
                      )}
                    </Button>
                  </div>

                  {conceptExplanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="bg-muted/30">
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-wrap">
                            {conceptExplanation}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {savedContent.filter((c) => c.type === "explanation").length > 0 && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Saved Explanations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {savedContent
                      .filter((c) => c.type === "explanation")
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">
                                {item.data.concept}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.data.explanation}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSavedContent(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Study Plan Tab */}
          <TabsContent value="studyplan">
            <div className="space-y-6">
              {!studyPlan ? (
                <Card className="glass border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <CalendarDays className="h-16 w-16 text-primary/50 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Generate Study Plan</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto text-center mb-6">
                      Get a personalized study plan organized by topics and difficulty
                    </p>
                    <Button
                      onClick={generateStudyPlan}
                      disabled={loadingStudyPlan || !selectedCourse}
                      className="gap-2"
                    >
                      {loadingStudyPlan ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Create Study Plan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Your Study Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        Estimated time: {studyPlan.totalDuration}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateStudyPlan}
                      disabled={loadingStudyPlan}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {studyPlan.sessions?.map((session: StudySession, idx: number) => (
                      <Card key={session.id} className="glass border-border/50">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  {idx + 1}
                                </div>
                                {session.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {session.duration}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {session.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-2">Topics:</p>
                            <div className="flex flex-wrap gap-2">
                              {session.topics.map((topic: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">Objectives:</p>
                            <ul className="space-y-1">
                              {session.objectives.map((obj: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
