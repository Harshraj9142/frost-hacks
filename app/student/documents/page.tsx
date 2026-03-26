"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  BookOpen,
  Calendar,
  FileType,
  HardDrive,
  Layers,
  X,
  RefreshCw,
  MessageSquare,
  Target,
  Lightbulb,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useCourseStore } from "@/lib/store";
import { useRouter } from "next/navigation";

interface Document {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  courseId: string;
  status: "processing" | "indexed" | "failed";
  chunkCount: number;
  pageCount?: number;
  uploadedAt: string;
  error?: string;
}

export default function StudentDocumentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const courses = useCourseStore((s) => s.courses);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = selectedCourse && selectedCourse !== "all"
        ? `/api/student/documents?courseId=${selectedCourse}`
        : "/api/student/documents";
      
      const response = await fetch(url);
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
      setIsLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (session) {
      fetchDocuments();
    }
  }, [session, fetchDocuments]);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group documents by course
  const documentsByCourse = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.courseId]) {
      acc[doc.courseId] = [];
    }
    acc[doc.courseId].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "indexed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return null;
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      // Create a download link for the document
      // Note: This requires the document file to be stored and accessible
      toast.info("Preparing download...");
      
      // TODO: Implement actual file download from storage
      // For now, we'll create a placeholder
      const response = await fetch(`/api/documents/${doc._id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Download started!");
      } else {
        // Fallback: Show info that download is not yet implemented
        toast.info("Download feature coming soon! File storage integration needed.");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download feature requires file storage setup");
    }
  };

  const handleViewDetails = (doc: Document) => {
    setSelectedDocument(doc);
    setDialogOpen(true);
  };

  const handleChatAboutDocument = (doc: Document) => {
    // Navigate to chat with document focused
    router.push(`/student/chat?focus=${doc._id}&course=${doc.courseId}`);
  };

  const handleQuickChat = (doc: Document, query: string) => {
    // Navigate to chat with pre-filled query
    router.push(`/student/chat?focus=${doc._id}&course=${doc.courseId}&q=${encodeURIComponent(query)}`);
  };

  const stats = {
    total: documents.length,
    indexed: documents.filter(d => d.status === "indexed").length,
    processing: documents.filter(d => d.status === "processing").length,
    failed: documents.filter(d => d.status === "failed").length,
    totalSize: documents.reduce((sum, d) => sum + d.fileSize, 0),
    totalChunks: documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0),
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Course Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and download documents uploaded by your instructors
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <Card className="glass border-border/50">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  {/* Course Filter */}
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
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

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="indexed">Indexed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""} found
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDocuments}
                    className="gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documents List */}
            {isLoading ? (
              <Card className="glass border-border/50">
                <CardContent className="py-20">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading documents...</p>
                  </div>
                </CardContent>
              </Card>
            ) : filteredDocuments.length === 0 ? (
              <Card className="glass border-border/50">
                <CardContent className="py-20">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your filters to see more results"
                        : "Your instructors haven't uploaded any materials yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(documentsByCourse).map(([courseId, courseDocs]) => {
                  const course = courses.find(c => c.id === courseId);
                  return (
                    <Card key={courseId} className="glass border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: course?.color || "#888" }}
                          />
                          {course?.code || "Unknown Course"} - {course?.name || ""}
                          <Badge variant="outline" className="ml-auto">
                            {courseDocs.length} document{courseDocs.length !== 1 ? "s" : ""}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {courseDocs.map((doc) => (
                            <motion.div
                              key={doc._id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                            >
                              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {doc.fileName}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                  {doc.pageCount && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        {doc.pageCount} pages
                                      </span>
                                    </>
                                  )}
                                  {doc.chunkCount > 0 && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        {doc.chunkCount} chunks
                                      </span>
                                    </>
                                  )}
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {getStatusIcon(doc.status)}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    doc.status === "indexed"
                                      ? "text-emerald-400 border-emerald-400/30"
                                      : doc.status === "processing"
                                      ? "text-amber-400 border-amber-400/30"
                                      : "text-red-400 border-red-400/30"
                                  }`}
                                >
                                  {doc.status}
                                </Badge>
                                
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDetails(doc)}
                                    title="View details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {doc.status === "indexed" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleChatAboutDocument(doc)}
                                      title="Chat about this document"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDownload(doc)}
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar - Statistics */}
          <div className="space-y-6">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total</span>
                    </div>
                    <span className="text-lg font-semibold">{stats.total}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-muted-foreground">Indexed</span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-400">
                      {stats.indexed}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-muted-foreground">Processing</span>
                    </div>
                    <span className="text-lg font-semibold text-amber-400">
                      {stats.processing}
                    </span>
                  </div>
                  
                  {stats.failed > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-muted-foreground">Failed</span>
                      </div>
                      <span className="text-lg font-semibold text-red-400">
                        {stats.failed}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Total Size</span>
                    </div>
                    <span className="font-medium">{formatFileSize(stats.totalSize)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Total Chunks</span>
                    </div>
                    <span className="font-medium">{stats.totalChunks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/student/chat")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Ask Questions
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/student/analytics")}
                >
                  <Target className="h-4 w-4" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Document Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-400">Indexed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ready for questions and chat
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Loader2 className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Processing</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Being indexed, available soon
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Failed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Error during processing
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Document Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this course material
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {selectedDocument.fileName}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileType className="h-3.5 w-3.5" />
                      <span>File Type</span>
                    </div>
                    <p className="font-medium">{selectedDocument.fileType.toUpperCase()}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>File Size</span>
                    </div>
                    <p className="font-medium">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>

                  {selectedDocument.pageCount && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Pages</span>
                      </div>
                      <p className="font-medium">{selectedDocument.pageCount}</p>
                    </div>
                  )}

                  {selectedDocument.chunkCount > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Chunks</span>
                      </div>
                      <p className="font-medium">{selectedDocument.chunkCount}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Uploaded</span>
                    </div>
                    <p className="font-medium">
                      {new Date(selectedDocument.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${
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

                  <div className="col-span-2">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Course</span>
                    </div>
                    <p className="font-medium">
                      {courses.find(c => c.id === selectedDocument.courseId)?.code} -{" "}
                      {courses.find(c => c.id === selectedDocument.courseId)?.name}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDocument.status === "indexed" && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm flex-1">
                      <p className="font-medium text-emerald-400 mb-1">Ready to Use</p>
                      <p className="text-muted-foreground text-xs mb-3">
                        This document has been indexed and is ready for questions in the chat.
                      </p>
                      
                      {/* Quick Question Templates */}
                      <div className="space-y-1.5 mt-3">
                        <p className="text-xs font-medium mb-2">Quick Questions:</p>
                        <button
                          onClick={() => {
                            handleQuickChat(selectedDocument, `Summarize the key points from ${selectedDocument.fileName}`);
                            setDialogOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 text-left text-xs transition-colors"
                        >
                          <BookOpen className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>Summarize this document</span>
                        </button>
                        <button
                          onClick={() => {
                            handleQuickChat(selectedDocument, `What are the main concepts in ${selectedDocument.fileName}?`);
                            setDialogOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 text-left text-xs transition-colors"
                        >
                          <Lightbulb className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>Key concepts</span>
                        </button>
                        <button
                          onClick={() => {
                            handleQuickChat(selectedDocument, `Give me practice questions based on ${selectedDocument.fileName}`);
                            setDialogOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 text-left text-xs transition-colors"
                        >
                          <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>Practice questions</span>
                        </button>
                      </div>
                    </div>
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
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-400 mb-1">Processing Failed</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedDocument.error || "There was an error processing this document."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {selectedDocument.status === "indexed" && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      handleChatAboutDocument(selectedDocument);
                      setDialogOpen(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Ask Questions
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleDownload(selectedDocument)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
