"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Plus,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Mic,
  FileText,
  Lightbulb,
  AlertTriangle,
  Brain,
  Sparkles,
  PanelRightOpen,
  PanelRightClose,
  Bookmark,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useChatStore,
  useCourseStore,
  useUIStore,
  type ChatMessage,
} from "@/lib/store";

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
        <Brain className="h-4 w-4 text-white" />
      </div>
      <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
                className="w-2 h-2 rounded-full bg-primary/60"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            Analyzing your course material…
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onOpenSources,
  onCopy,
}: {
  message: ChatMessage;
  onOpenSources: () => void;
  onCopy: (text: string) => void;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState("hints");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-primary/20 border border-primary/10 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-md">
          <p className="text-sm">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 max-w-2xl"
    >
      <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
        <Brain className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 space-y-3">
        {/* Out of scope warning */}
        {message.isOutOfScope && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-400/10 border border-amber-400/20 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300">
              This is outside your course material
            </span>
          </div>
        )}

        {/* Main response */}
        <div className="bg-muted/40 rounded-2xl rounded-bl-sm px-4 py-3 space-y-3">
          {/* Confidence badge */}
          {message.confidence && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  message.confidence === "high"
                    ? "text-emerald-400 border-emerald-400/30"
                    : message.confidence === "medium"
                    ? "text-amber-400 border-amber-400/30"
                    : "text-red-400 border-red-400/30"
                }`}
              >
                {message.confidence === "high" ? "🎯" : message.confidence === "medium" ? "🔶" : "⚠️"}{" "}
                {message.confidence} confidence
              </Badge>
            </div>
          )}

          <p className="text-sm leading-relaxed">{message.content}</p>

          {/* Expandable Answer Layers */}
          {(message.hints || message.explanation || message.example || message.practiceQuestion) && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-3"
            >
              <TabsList className="h-8 bg-background/50">
                {message.hints && (
                  <TabsTrigger value="hints" className="text-xs h-6 gap-1">
                    <Lightbulb className="h-3 w-3" /> Hints
                  </TabsTrigger>
                )}
                {message.explanation && (
                  <TabsTrigger
                    value="explanation"
                    className="text-xs h-6 gap-1"
                  >
                    <BookOpen className="h-3 w-3" /> Explain
                  </TabsTrigger>
                )}
                {message.example && (
                  <TabsTrigger value="example" className="text-xs h-6 gap-1">
                    <Sparkles className="h-3 w-3" /> Example
                  </TabsTrigger>
                )}
                {message.practiceQuestion && (
                  <TabsTrigger value="practice" className="text-xs h-6 gap-1">
                    <Zap className="h-3 w-3" /> Practice
                  </TabsTrigger>
                )}
              </TabsList>

              {message.hints && (
                <TabsContent value="hints" className="mt-3 space-y-2">
                  {message.hints.map((hint, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm"
                    >
                      <span className="text-primary text-xs font-medium">
                        💡 Hint {i + 1}
                      </span>
                      <p className="mt-1 text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </TabsContent>
              )}

              {message.explanation && (
                <TabsContent value="explanation" className="mt-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-sm leading-relaxed">
                    {message.explanation}
                  </div>
                </TabsContent>
              )}

              {message.example && (
                <TabsContent value="example" className="mt-3">
                  <div className="p-3 rounded-lg bg-muted/30 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {message.example}
                  </div>
                </TabsContent>
              )}

              {message.practiceQuestion && (
                <TabsContent value="practice" className="mt-3">
                  <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/10 text-sm">
                    <span className="text-amber-400 text-xs font-medium">
                      🎯 Practice Question
                    </span>
                    <p className="mt-1">{message.practiceQuestion}</p>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {message.citations.map((cite, i) => (
                <button
                  key={i}
                  onClick={onOpenSources}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-xs text-primary transition-colors"
                >
                  <FileText className="h-3 w-3" />
                  {cite.fileName}, p.{cite.pageNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Bookmark className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Suggestions */}
        {message.suggestions && (
          <div className="flex flex-wrap gap-2">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                className="text-xs px-3 py-1.5 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [sources, setSources] = useState<any[]>([]);
  const [courseDocuments, setCourseDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { tutorMode, setTutorMode } = useChatStore();
  const courses = useCourseStore((s) => s.courses);
  const { focusMode, toggleFocusMode } = useUIStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Fetch course documents when course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDocuments();
    }
  }, [selectedCourse]);

  const fetchCourseDocuments = async () => {
    if (!selectedCourse) return;
    
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?courseId=${selectedCourse}`);
      if (res.ok) {
        const data = await res.json();
        setCourseDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportChat = () => {
    const chatText = messages
      .map((msg) => {
        const role = msg.role === "user" ? "You" : "AI Tutor";
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `[${timestamp}] ${role}:\n${msg.content}\n`;
      })
      .join("\n---\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${selectedCourse}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSources([]);
    setInput("");
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedCourse) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          courseId: selectedCourse,
          conversationHistory,
        }),
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.error) {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: data.error,
          timestamp: new Date(),
          isOutOfScope: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          confidence: data.metadata?.hasSocraticQuestions ? "high" : "medium",
        };
        setMessages((prev) => [...prev, aiMsg]);
        
        if (data.sources && data.sources.length > 0) {
          setSources(data.sources);
          if (!sourcesOpen) {
            setSourcesOpen(true);
          }
        }
      }
    } catch (error) {
      setIsTyping(false);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        isOutOfScope: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <div className="h-screen pt-14 flex">
      {/* Left Sidebar */}
      <AnimatePresence>
        {sidebarOpen && !focusMode && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:flex flex-col border-r border-border/50 bg-card/50 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <Button 
                onClick={handleNewChat}
                className="w-full gap-2 gradient-primary text-white border-0 shadow-md"
              >
                <Plus className="h-4 w-4" /> New Chat
              </Button>

              {/* Courses */}
              <div>
                <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">
                  SELECT COURSE
                </h3>
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm mb-1 ${
                      selectedCourse === course.id ? "bg-primary/10 border border-primary/20" : ""
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate">{course.code}</span>
                    {selectedCourse === course.id && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Course Documents Info */}
              {selectedCourse && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Course Materials</span>
                  </div>
                  {loadingDocs ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total Documents</span>
                        <span className="font-medium">{courseDocuments.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Indexed</span>
                        <span className="font-medium text-emerald-400">
                          {courseDocuments.filter(d => d.status === "indexed").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total Chunks</span>
                        <span className="font-medium">
                          {courseDocuments.reduce((sum, d) => sum + (d.chunkCount || 0), 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-card/30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm font-medium">
              {selectedCourse 
                ? courses.find(c => c.id === selectedCourse)?.name || "Chat"
                : "Select a course to start"}
            </span>
            {selectedCourse && (
              <Badge variant="outline" className="text-[10px]">
                {courses.find(c => c.id === selectedCourse)?.code}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={handleExportChat}
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
            )}
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-muted-foreground">
                {tutorMode === "guided" ? "Guided" : "Direct"}
              </span>
              <Switch
                checked={tutorMode === "direct"}
                onCheckedChange={(v) =>
                  setTutorMode(v ? "direct" : "guided")
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleFocusMode}
            >
              {focusMode ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSourcesOpen(!sourcesOpen)}
            >
              {sourcesOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome */}
            {messages.length === 0 && (
              <div className="text-center py-20">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 glow-md">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {selectedCourse 
                    ? "What would you like to learn?"
                    : "Select a course to start chatting"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCourse
                    ? "Ask anything from your course materials"
                    : "Choose a course from the sidebar"}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onOpenSources={() => setSourcesOpen(true)}
                onCopy={handleCopyMessage}
              />
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/30">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your course materials..."
                  className="min-h-[44px] max-h-[120px] resize-none pr-20 bg-muted/30 border-border/50"
                  rows={1}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${isRecording ? "text-red-400" : ""}`}
                    onClick={() => setIsRecording(!isRecording)}
                  >
                    <Mic className="h-4 w-4" />
                    {isRecording && (
                      <motion.div
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 rounded-md bg-red-400/20"
                      />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !selectedCourse}
                className="h-[44px] w-[44px] gradient-primary text-white border-0 shadow-md flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Sources */}
      <AnimatePresence>
        {sourcesOpen && !focusMode && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:flex flex-col border-l border-border/50 bg-card/50 overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Sources & Citations
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSourcesOpen(false)}
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {sources.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No sources yet.</p>
                    <p className="text-xs mt-1">Ask a question to see relevant materials.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-medium">
                          {sources.length} Relevant Sources Found
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        All responses are based on these course materials
                      </p>
                    </div>
                    
                    {sources.map((source, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs font-medium truncate">
                              {source.fileName}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {(source.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {source.chunkIndex !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            Chunk #{source.chunkIndex + 1}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed border-l-2 border-primary/30 pl-3 text-muted-foreground">
                          {source.text}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
