"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Send,
  Loader2,
  Upload,
  Trash2,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentDocument {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: "processing" | "indexed" | "failed";
  chunkCount: number;
  pageCount?: number;
  uploadedAt: string;
  error?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}

export default function StudentStudyPage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingDocs, setIsFetchingDocs] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchDocuments = async () => {
    setIsFetchingDocs(true);
    try {
      const response = await fetch("/api/student/my-documents");
      const data = await response.json();
      
      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        toast.error(data.error || "Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsFetchingDocs(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDocuments();
    }
  }, [session]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      toast.error("Only PDF and TXT files are supported");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/student/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Document uploaded! Processing in background...");
        fetchDocuments();
      } else {
        toast.error(data.error || "Failed to upload document");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/student/my-documents?documentId=${documentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Document deleted successfully");
        fetchDocuments();
        if (selectedDocument === documentId) {
          setSelectedDocument("all");
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const indexedDocs = documents.filter(d => d.status === "indexed");
    if (indexedDocs.length === 0) {
      toast.error("Please upload and wait for documents to be indexed first");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/student/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          documentId: selectedDocument !== "all" ? selectedDocument : null,
          conversationHistory: messages.slice(-6),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          sources: data.sources,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        toast.error(data.error || "Failed to get response");
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const indexedDocs = documents.filter(d => d.status === "indexed");
  const processingDocs = documents.filter(d => d.status === "processing");

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Study with Your Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your own documents and ask questions using AI
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Documents */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>My Documents</span>
                  <Badge variant="outline">{indexedDocs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PDF or TXT, max 10MB
                  </p>
                </div>

                {/* Document Filter */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Study from:
                  </label>
                  <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Documents</SelectItem>
                      {indexedDocs.map((doc) => (
                        <SelectItem key={doc._id} value={doc._id}>
                          {doc.fileName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {isFetchingDocs ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        No documents yet
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-4">
                        {documents.map((doc) => (
                          <div
                            key={doc._id}
                            className="p-3 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(doc.fileSize)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => handleDeleteDocument(doc._id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.status === "indexed" && (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-emerald-400 border-emerald-400/30"
                                  >
                                    Ready
                                  </Badge>
                                </>
                              )}
                              {doc.status === "processing" && (
                                <>
                                  <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-amber-400 border-amber-400/30"
                                  >
                                    Processing
                                  </Badge>
                                </>
                              )}
                              {doc.status === "failed" && (
                                <>
                                  <AlertCircle className="h-3 w-3 text-red-400" />
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-red-400 border-red-400/30"
                                  >
                                    Failed
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {processingDocs.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400">
                      {processingDocs.length} document(s) processing...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="glass border-border/50 h-[calc(100vh-200px)]">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Study Session
                  {selectedDocument !== "all" && (
                    <Badge variant="outline" className="ml-auto">
                      Focused: {documents.find(d => d._id === selectedDocument)?.fileName}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">
                        Start Studying
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Upload your documents and ask questions. I'll help you understand the material better!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/50 border border-border/50"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/30">
                                  <p className="text-xs font-medium mb-2">
                                    Sources:
                                  </p>
                                  <div className="space-y-1">
                                    {msg.sources.map((source, i) => (
                                      <div
                                        key={i}
                                        className="text-xs text-muted-foreground"
                                      >
                                        [{source.sourceNumber}] {source.fileName}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-muted/50 border border-border/50 rounded-lg p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        indexedDocs.length === 0
                          ? "Upload documents first..."
                          : "Ask a question about your documents..."
                      }
                      disabled={isLoading || indexedDocs.length === 0}
                      className="min-h-[60px] resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !input.trim() || indexedDocs.length === 0}
                      size="icon"
                      className="h-[60px] w-[60px]"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
