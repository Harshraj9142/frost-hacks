"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Plus,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
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
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  X,
  Pin,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useChatStore,
  useCourseStore,
  useUIStore,
  type ChatMessage,
} from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { FeedbackDialog } from "@/components/feedback-dialog";

// Helper function to format response text with enhanced structure
function formatResponseText(text: string) {
  // Split by double newlines for paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    const trimmed = paragraph.trim();
    
    // Check if it's a section header (## Header)
    if (/^##\s+/.test(trimmed)) {
      const headerText = trimmed.replace(/^##\s+/, '');
      return (
        <div key={idx} className="mt-4 mb-2">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            {headerText}
          </h3>
          <div className="h-px bg-gradient-to-r from-primary/30 to-transparent mt-1.5" />
        </div>
      );
    }
    
    // Check if it's a numbered list item
    if (/^\d+\./.test(trimmed)) {
      const items = paragraph.split('\n').filter(item => item.trim());
      return (
        <ol key={idx} className="list-decimal list-inside space-y-2.5 my-3 ml-1">
          {items.map((item, i) => {
            const content = item.replace(/^\d+\.\s*/, '');
            return (
              <li key={i} className="text-sm leading-relaxed pl-2 text-muted-foreground">
                <span className="text-foreground">{formatInlineContent(content)}</span>
              </li>
            );
          })}
        </ol>
      );
    }
    
    // Check if it's a bulleted list
    if (/^[-•*]/.test(trimmed)) {
      const items = paragraph.split('\n').filter(item => item.trim());
      return (
        <ul key={idx} className="space-y-2.5 my-3 ml-1">
          {items.map((item, i) => {
            const content = item.replace(/^[-•*]\s*/, '');
            return (
              <li key={i} className="text-sm leading-relaxed pl-2 flex items-start gap-2">
                <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                <span className="text-foreground">{formatInlineContent(content)}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    
    // Check if it's a question (ends with ?)
    if (trimmed.endsWith('?')) {
      return (
        <div key={idx} className="my-3 p-3 rounded-lg bg-primary/5 border-l-2 border-primary">
          <p className="text-sm leading-relaxed font-medium text-primary">
            {formatInlineContent(trimmed)}
          </p>
        </div>
      );
    }
    
    // Check if it's a source attribution (starts with parentheses)
    if (/^\(Based on|^\(Source|^\(According to/.test(trimmed)) {
      return (
        <p key={idx} className="text-xs text-muted-foreground italic mt-3 mb-2">
          {trimmed}
        </p>
      );
    }
    
    // Regular paragraph with inline formatting
    return (
      <p key={idx} className="text-sm leading-relaxed my-2 text-foreground">
        {formatInlineContent(trimmed)}
      </p>
    );
  });
}

// Helper function to format inline content (bold, code, etc.)
function formatInlineContent(text: string) {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Pattern to match backticks (code) and **bold**
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    
    const matched = match[0];
    if (matched.startsWith('`') && matched.endsWith('`')) {
      // Code
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs mx-0.5">
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {matched.slice(2, -2)}
        </strong>
      );
    }
    
    currentIndex = match.index + matched.length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }
  
  return parts.length > 0 ? parts : text;
}

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
  onFeedback,
}: {
  message: ChatMessage;
  onOpenSources: () => void;
  onCopy: (text: string) => void;
  onFeedback: () => void;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState("hints");
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

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

          <div className="prose prose-sm max-w-none">
            {formatResponseText(message.content)}
          </div>

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
          {message.sources && message.sources.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] text-muted-foreground font-medium">SOURCES</span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((source: any, i: number) => (
                  <button
                    key={i}
                    onClick={onOpenSources}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-xs text-primary transition-colors border border-primary/20"
                    title={source.text}
                  >
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">[{i + 1}]</span>
                    <span className="truncate max-w-[120px]">{source.fileName}</span>
                    {source.pageInfo && source.pageInfo !== 'N/A' && (
                      <>
                        <span className="text-primary/60">•</span>
                        <span>{source.pageInfo}</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-1">
                      {(source.score * 100).toFixed(0)}%
                    </Badge>
                  </button>
                ))}
              </div>
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
            title="Copy response"
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            title="Bookmark"
          >
            <Bookmark className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-7 w-7 ${feedbackGiven ? 'text-emerald-400' : ''}`}
            onClick={() => {
              onFeedback();
              setFeedbackGiven(true);
            }}
            title="Rate this response"
          >
            <ThumbsUp className="h-3 w-3" />
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
  const searchParams = useSearchParams();
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
  const [showDocuments, setShowDocuments] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"all" | "indexed" | "processing">("all");
  const [selectedDocumentForChat, setSelectedDocumentForChat] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"all" | "document">("all");
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { tutorMode, setTutorMode } = useChatStore();
  const courses = useCourseStore((s) => s.courses);
  const { focusMode, toggleFocusMode } = useUIStore();

  // Handle URL parameters for document focus, course, and pre-filled query
  useEffect(() => {
    const focusDocId = searchParams.get("focus");
    const courseParam = searchParams.get("course");
    const queryParam = searchParams.get("q");
    
    if (focusDocId) {
      setSelectedDocumentForChat(focusDocId);
      setChatMode("document");
    }
    
    if (courseParam && !selectedCourse) {
      setSelectedCourse(courseParam);
    }
    
    if (queryParam) {
      setInput(decodeURIComponent(queryParam));
    }
  }, [searchParams, selectedCourse]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Fetch course documents function
  const fetchCourseDocuments = useCallback(async () => {
    if (!selectedCourse) {
      console.log("No course selected, skipping fetch");
      return;
    }
    
    console.log("Fetching documents for course:", selectedCourse);
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/student/documents?courseId=${selectedCourse}`);
      console.log("API response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("Documents fetched:", data.documents?.length || 0, "documents");
        setCourseDocuments(data.documents || []);
      } else {
        const errorData = await res.json();
        console.error("Failed to fetch documents:", res.status, errorData);
        setCourseDocuments([]);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setCourseDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedCourse]);

  // Fetch course documents when course is selected
  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDocuments();
    } else {
      setCourseDocuments([]);
    }
  }, [selectedCourse, fetchCourseDocuments]);

  // Auto-refresh documents if any are processing
  useEffect(() => {
    if (!selectedCourse) return;
    
    const hasProcessingDocs = courseDocuments.some(doc => doc.status === "processing");
    
    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        fetchCourseDocuments();
      }, 10000); // Refresh every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [selectedCourse, courseDocuments, fetchCourseDocuments]);

  // Filter documents based on search and filter
  const filteredDocuments = courseDocuments.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(documentSearch.toLowerCase());
    const matchesFilter = 
      documentFilter === "all" || 
      doc.status === documentFilter;
    return matchesSearch && matchesFilter;
  });

  // Debug logging
  useEffect(() => {
    console.log("Course documents state:", courseDocuments.length, "documents");
    console.log("Filtered documents:", filteredDocuments.length, "documents");
    console.log("Selected course:", selectedCourse);
  }, [courseDocuments, filteredDocuments, selectedCourse]);

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

    console.log("Sending message with focus:", selectedDocumentForChat);

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

      const requestBody = {
        message: currentInput,
        courseId: selectedCourse,
        conversationHistory,
        focusedDocumentId: selectedDocumentForChat,
        tutorMode: tutorMode, // Add tutor mode to request
      };

      console.log("Request body:", requestBody);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("Response metadata:", data.metadata);
      console.log("Response queryLogId:", data.queryLogId); // Debug log
      console.log("Citations:", data.citations);
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
          confidence: data.isOutOfScope ? "low" : data.metadata?.isQualityResponse ? "high" : "medium",
          sources: data.sources || [],
          isOutOfScope: data.isOutOfScope || false,
          queryLogId: data.queryLogId, // Store queryLogId for feedback
        };
        console.log("Created AI message with queryLogId:", aiMsg.queryLogId); // Debug log
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
            className="hidden lg:flex flex-col border-r-[3px] border-foreground overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <Button 
                onClick={handleNewChat}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" /> NEW CHAT
              </Button>

              {/* Courses */}
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider mb-2 px-1">
                  SELECT COURSE
                </h3>
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`w-full text-left p-2.5 transition-colors flex items-center gap-2 text-sm mb-1 border-[3px] ${
                      selectedCourse === course.id ? "border-foreground" : "border-transparent"
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="truncate">{course.code}</span>
                    {selectedCourse === course.id && (
                      <span className="ml-auto font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Course Documents */}
              {selectedCourse && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-xs uppercase font-bold tracking-wider">
                      COURSE MATERIALS
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={fetchCourseDocuments}
                        disabled={loadingDocs}
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingDocs ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setShowDocuments(!showDocuments)}
                      >
                        {showDocuments ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Stats Summary */}
                  <div className="p-3 border-[3px] border-foreground mb-2">
                    {loadingDocs ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="uppercase font-bold tracking-wider">Total Documents</span>
                          <span className="font-bold font-serif">{courseDocuments.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="uppercase font-bold tracking-wider">Indexed</span>
                          <span className="font-bold font-serif">
                            {courseDocuments.filter(d => d.status === "indexed").length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="uppercase font-bold tracking-wider">Total Chunks</span>
                          <span className="font-bold font-serif">
                            {courseDocuments.reduce((sum, d) => sum + (d.chunkCount || 0), 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search and Filter */}
                  {showDocuments && courseDocuments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" />
                        <input
                          type="text"
                          placeholder="Search documents..."
                          value={documentSearch}
                          onChange={(e) => setDocumentSearch(e.target.value)}
                          className="w-full h-7 pl-7 pr-7 text-xs border-[3px] border-foreground focus:outline-none"
                        />
                        {documentSearch && (
                          <button
                            onClick={() => setDocumentSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        {["all", "indexed", "processing"].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setDocumentFilter(filter as any)}
                            className={`flex-1 text-[10px] py-1 px-2 transition-colors uppercase font-bold tracking-wider border-[3px] ${
                              documentFilter === filter
                                ? "border-foreground"
                                : "border-transparent"
                            }`}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents List */}
                  {showDocuments && (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {loadingDocs ? (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Loading documents...
                          </div>
                        ) : filteredDocuments.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            {documentSearch || documentFilter !== "all" ? (
                              <>
                                <p>No matching documents</p>
                                <button
                                  onClick={() => {
                                    setDocumentSearch("");
                                    setDocumentFilter("all");
                                  }}
                                  className="text-primary text-[10px] mt-1 hover:underline"
                                >
                                  Clear filters
                                </button>
                              </>
                            ) : (
                              <>
                                <p>No documents yet</p>
                                <p className="text-[10px] mt-1">
                                  Ask your instructor to upload materials
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          filteredDocuments.map((doc) => (
                            <div
                              key={doc._id}
                              className={`w-full p-3 rounded-lg transition-all border ${
                                selectedDocumentForChat === doc._id
                                  ? "bg-primary/10 border-primary/40 shadow-md"
                                  : "bg-muted/20 hover:bg-muted/40 border-border/30"
                              }`}
                            >
                              <button
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setDocumentDialogOpen(true);
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-start gap-2">
                                  <FileText className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                                    selectedDocumentForChat === doc._id ? "text-primary" : "text-muted-foreground"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-xs font-medium truncate flex-1 ${
                                        selectedDocumentForChat === doc._id ? "text-primary" : ""
                                      }`}>
                                        {doc.fileName}
                                      </p>
                                      {selectedDocumentForChat === doc._id && (
                                        <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 h-4 ${
                                          doc.status === "indexed"
                                            ? "text-emerald-400 border-emerald-400/30"
                                            : doc.status === "processing"
                                            ? "text-amber-400 border-amber-400/30"
                                            : "text-red-400 border-red-400/30"
                                        }`}
                                      >
                                        {doc.status === "indexed" && (
                                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                        )}
                                        {doc.status === "processing" && (
                                          <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                                        )}
                                        {doc.status === "failed" && (
                                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                        )}
                                        {doc.status}
                                      </Badge>
                                      {doc.chunkCount > 0 && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {doc.chunkCount} chunks
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                                      {doc.pageCount && <span>• {doc.pageCount} pages</span>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {new Date(doc.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </button>
                              
                              {/* Quick action buttons */}
                              {doc.status === "indexed" && (
                                <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const isCurrentlyFocused = selectedDocumentForChat === doc._id;
                                      setSelectedDocumentForChat(isCurrentlyFocused ? null : doc._id);
                                      setChatMode(isCurrentlyFocused ? "all" : "document");
                                    }}
                                    className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                                      selectedDocumentForChat === doc._id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                    }`}
                                  >
                                    <Target className="h-3.5 w-3.5" />
                                    {selectedDocumentForChat === doc._id ? "Focused ✓" : "Focus Chat"}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
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
            {selectedDocumentForChat && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Focused: {courseDocuments.find(d => d._id === selectedDocumentForChat)?.fileName}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => {
                    setSelectedDocumentForChat(null);
                    setChatMode("all");
                  }}
                  title="Clear document focus"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
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
                    ? selectedDocumentForChat
                      ? `Ask about ${courseDocuments.find(d => d._id === selectedDocumentForChat)?.fileName}`
                      : "What would you like to learn?"
                    : "Select a course to start chatting"}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {selectedCourse
                    ? selectedDocumentForChat
                      ? "Your questions will focus on this specific document"
                      : "Ask anything from your course materials"
                    : "Choose a course from the sidebar"}
                </p>

                {/* Document Focus Indicator */}
                {selectedDocumentForChat && (
                  <div className="max-w-md mx-auto mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-primary">Document Focus Active</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Searching only in: {courseDocuments.find(d => d._id === selectedDocumentForChat)?.fileName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedDocumentForChat(null);
                          setChatMode("all");
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                {selectedCourse && courseDocuments.filter(d => d.status === "indexed").length > 0 && (
                  <div className="max-w-md mx-auto mt-8">
                    <p className="text-xs text-muted-foreground mb-3">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setInput("What are the main topics covered in the course materials?")}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 text-left transition-colors group"
                      >
                        <BookOpen className="h-4 w-4 text-primary mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">Overview</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Get course summary</p>
                      </button>
                      
                      <button
                        onClick={() => setInput("What are the key concepts I should focus on?")}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 text-left transition-colors group"
                      >
                        <Zap className="h-4 w-4 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">Key Concepts</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Focus areas</p>
                      </button>
                      
                      <button
                        onClick={() => setInput("Can you give me practice questions?")}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 text-left transition-colors group"
                      >
                        <Lightbulb className="h-4 w-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">Practice</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Test yourself</p>
                      </button>
                      
                      <button
                        onClick={() => setInput("Explain the most important topics step by step")}
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 border border-border/50 text-left transition-colors group"
                      >
                        <Sparkles className="h-4 w-4 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-medium">Explain</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Deep dive</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* No documents message */}
                {selectedCourse && courseDocuments.filter(d => d.status === "indexed").length === 0 && (
                  <div className="max-w-md mx-auto mt-8 p-4 rounded-lg bg-amber-400/5 border border-amber-400/20">
                    <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-amber-300 mb-1">No indexed documents yet</p>
                    <p className="text-xs text-muted-foreground">
                      {courseDocuments.length === 0 
                        ? "Ask your instructor to upload course materials"
                        : "Documents are being processed. Check back soon!"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onOpenSources={() => setSourcesOpen(true)}
                onCopy={handleCopyMessage}
                onFeedback={() => {
                  setFeedbackMessageId(msg.id);
                  setFeedbackDialogOpen(true);
                }}
              />
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-card/30">
          <div className="max-w-3xl mx-auto">
            {/* Document Focus Banner */}
            {selectedDocumentForChat && (
              <div className="mb-2 p-2 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">
                    Searching in: <span className="text-primary font-medium">{courseDocuments.find(d => d._id === selectedDocumentForChat)?.fileName}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => {
                    setSelectedDocumentForChat(null);
                    setChatMode("all");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Focus
                </Button>
              </div>
            )}
            
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
                  placeholder={
                    selectedDocumentForChat
                      ? `Ask about ${courseDocuments.find(d => d._id === selectedDocumentForChat)?.fileName}...`
                      : "Ask about your course materials..."
                  }
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
                        className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors space-y-2 border border-border/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex items-center justify-center h-5 w-5 rounded bg-primary/20 text-primary text-[10px] font-bold flex-shrink-0">
                              {i + 1}
                            </div>
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
                        
                        {/* Page Information */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {source.pageInfo && source.pageInfo !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              <span className="font-medium">{source.pageInfo}</span>
                            </div>
                          )}
                          {source.chunkIndex !== undefined && (
                            <div className="flex items-center gap-1">
                              <span>Chunk #{source.chunkIndex + 1}</span>
                            </div>
                          )}
                          {source.fileType && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
                              {source.fileType}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Citation Text */}
                        <div className="space-y-1">
                          <p className="text-xs leading-relaxed border-l-2 border-primary/30 pl-3 text-muted-foreground">
                            {source.text}
                          </p>
                          {source.inlineCitation && (
                            <p className="text-[9px] text-muted-foreground/70 font-mono pl-3">
                              {source.inlineCitation}
                            </p>
                          )}
                        </div>
                        
                        {/* Copy Citation Button */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              const citationText = source.bibliographyCitation || source.inlineCitation || `${source.fileName}${source.pageInfo ? ', ' + source.pageInfo : ''}`;
                              navigator.clipboard.writeText(citationText);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Citation
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Document Details Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Details
            </DialogTitle>
            <DialogDescription>
              View information about this course material
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-medium mb-3">{selectedDocument.fileName}</h3>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedDocument.status === "indexed"
                            ? "text-emerald-400 border-emerald-400/30"
                            : selectedDocument.status === "processing"
                            ? "text-amber-400 border-amber-400/30"
                            : "text-red-400 border-red-400/30"
                        }`}
                      >
                        {selectedDocument.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">File Size</span>
                    <p className="mt-1 font-medium">
                      {(selectedDocument.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  
                  {selectedDocument.pageCount && (
                    <div>
                      <span className="text-muted-foreground">Pages</span>
                      <p className="mt-1 font-medium">{selectedDocument.pageCount}</p>
                    </div>
                  )}
                  
                  {selectedDocument.chunkCount && (
                    <div>
                      <span className="text-muted-foreground">Chunks</span>
                      <p className="mt-1 font-medium">{selectedDocument.chunkCount}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Uploaded</span>
                    <p className="mt-1 font-medium">
                      {new Date(selectedDocument.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Course</span>
                    <p className="mt-1 font-medium">
                      {courses.find(c => c.id === selectedDocument.courseId)?.code}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDocument.status === "indexed" && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-400 mb-1">Ready to Query</p>
                      <p className="text-muted-foreground text-xs">
                        This document has been processed and indexed. You can now ask questions about its content in the chat.
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Questions */}
                  <div className="space-y-1.5 mt-3">
                    <p className="text-xs font-medium mb-2">Quick Questions:</p>
                    {[
                      { icon: BookOpen, text: "Summarize this document", query: `Summarize the key points from ${selectedDocument.fileName}` },
                      { icon: Lightbulb, text: "Key concepts", query: `What are the main concepts in ${selectedDocument.fileName}?` },
                      { icon: Zap, text: "Practice questions", query: `Give me practice questions based on ${selectedDocument.fileName}` },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(item.query);
                          setDocumentDialogOpen(false);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 text-left text-xs transition-colors"
                      >
                        <item.icon className="h-3 w-3 text-primary flex-shrink-0" />
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDocument.status === "processing" && (
                <div className="p-4 rounded-lg bg-amber-400/5 border border-amber-400/10">
                  <div className="flex items-start gap-2">
                    <Loader2 className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5 animate-spin" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-400 mb-1">Processing</p>
                      <p className="text-muted-foreground text-xs">
                        This document is being processed and will be available soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedDocument.status === "failed" && (
                <div className="p-4 rounded-lg bg-red-400/5 border border-red-400/10">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-400 mb-1">Processing Failed</p>
                      <p className="text-muted-foreground text-xs">
                        There was an error processing this document. Please contact your instructor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setInput(`Tell me about the key concepts in ${selectedDocument.fileName}`);
                    setDocumentDialogOpen(false);
                  }}
                  disabled={selectedDocument.status !== "indexed"}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask About This
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInput(`Summarize ${selectedDocument.fileName}`);
                    setDocumentDialogOpen(false);
                  }}
                  disabled={selectedDocument.status !== "indexed"}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Summarize
                </Button>
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setDocumentDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      {feedbackMessageId && (
        <FeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          queryLogId={messages.find(m => m.id === feedbackMessageId)?.queryLogId || ''}
          courseId={selectedCourse}
          tutorMode={tutorMode}
          hadMultipleDocuments={(messages.find(m => m.id === feedbackMessageId)?.sources?.length || 0) > 1}
          documentCount={new Set(messages.find(m => m.id === feedbackMessageId)?.sources?.map((s: any) => s.fileName) || []).size || 1}
          responseLength={messages.find(m => m.id === feedbackMessageId)?.content.length || 0}
          onFeedbackSubmitted={() => {
            console.log('Feedback submitted successfully');
          }}
        />
      )}
    </div>
  );
}
