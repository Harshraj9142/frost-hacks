"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCourseStore } from "@/lib/store";
import { useDropzone } from "react-dropzone";

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

export default function DocumentsPage() {
  const { data: session } = useSession();
  const courses = useCourseStore((s) => s.courses);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const url = selectedCourse
        ? `/api/documents?courseId=${selectedCourse}`
        : "/api/documents";
      const response = await fetch(url);
      const data = await response.json();
      setDocuments(data.documents || []);
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
  }, [session, selectedCourse, fetchDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedCourse) {
        toast.error("Please select a course first");
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", selectedCourse);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        toast.success("File uploaded successfully! Processing...");
        
        // Refresh documents list
        setTimeout(() => fetchDocuments(), 2000);
      } catch (error: any) {
        toast.error(error.message || "Failed to upload file");
      } finally {
        setIsUploading(false);
      }
    },
    [selectedCourse, fetchDocuments]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !selectedCourse || isUploading,
  });

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

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

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold">Course Materials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage documents for your courses
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="feature-box">
              <div className="mb-6 pb-4 border-b-2 border-foreground">
                <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Document
                </h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs tracking-wider">Select Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="border-2 border-foreground/30">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-3 border-dashed p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? "border-foreground bg-foreground/5"
                      : selectedCourse
                      ? "border-foreground/30 hover:border-foreground/50 hover:bg-foreground/5"
                      : "border-foreground/20 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <input {...getInputProps()} />
                  {isUploading ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 mx-auto animate-spin text-foreground" />
                      <div>
                        <p className="text-sm font-bold mb-1">
                          Uploading and processing...
                        </p>
                        <p className="text-xs text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                          This may take a few moments
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className={`h-12 w-12 mx-auto mb-4 ${
                        selectedCourse ? "text-foreground" : "text-muted-foreground"
                      }`} />
                      <p className="text-sm font-bold mb-1">
                        {isDragActive
                          ? "Drop the file here"
                          : selectedCourse
                          ? "Drag & drop a file here, or click to select"
                          : "Please select a course first"}
                      </p>
                      <p className="text-xs text-muted-foreground italic" style={{ fontFamily: 'Georgia, serif' }}>
                        Supports PDF and TXT files (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="feature-box">
              <div className="mb-6 pb-4 border-b-2 border-foreground">
                <h2 className="text-lg font-black uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uploaded Documents
                </h2>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center gap-3 p-3 border-2 border-foreground/20 hover:border-foreground/40 transition-colors bg-card"
                    >
                      <FileText className="h-5 w-5 text-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {doc.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground font-semibold">
                            {formatFileSize(doc.fileSize)}
                          </span>
                          {doc.pageCount && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground font-semibold">
                                {doc.pageCount} pages
                              </span>
                            </>
                          )}
                          {doc.chunkCount > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground font-semibold">
                                {doc.chunkCount} chunks
                              </span>
                            </>
                          )}
                        </div>
                        {doc.status === "failed" && doc.error && (
                          <p className="text-xs text-red-400 mt-1 italic" style={{ fontFamily: 'Georgia, serif' }}>
                            Error: {doc.error}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        <div className={`px-2 py-1 border flex items-center gap-1 ${
                          doc.status === "indexed"
                            ? "border-foreground/30"
                            : doc.status === "processing"
                            ? "border-foreground/30"
                            : "border-red-400/30"
                        }`}>
                          <span className="text-[9px] font-bold tracking-wider uppercase">
                            {doc.status}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border-2 border-foreground/30 hover:border-foreground/50 hover:bg-foreground/5"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* Statistics Card */}
            <div className="feature-box">
              <div className="mb-4 pb-3 border-b-2 border-foreground">
                <h3 className="text-base font-black uppercase tracking-wide">Statistics</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-foreground/20">
                  <span className="text-sm text-muted-foreground font-semibold">Total Documents</span>
                  <span className="text-lg font-black">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-foreground/20">
                  <span className="text-sm text-muted-foreground font-semibold">Indexed</span>
                  <span className="text-lg font-black">
                    {documents.filter(d => d.status === "indexed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-foreground/20">
                  <span className="text-sm text-muted-foreground font-semibold">Processing</span>
                  <span className="text-lg font-black">
                    {documents.filter(d => d.status === "processing").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-semibold">Failed</span>
                  <span className="text-lg font-black">
                    {documents.filter(d => d.status === "failed").length}
                  </span>
                </div>
              </div>
            </div>

            <div className="feature-box">
              <div className="mb-4 pb-3 border-b-2 border-foreground">
                <h3 className="text-base font-black uppercase tracking-wide">Upload Guidelines</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    PDF and TXT files supported
                  </span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Maximum file size: 10MB
                  </span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Documents are automatically indexed
                  </span>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Students can query indexed content
                  </span>
                </div>
              </div>
            </div>

            <div className="feature-box">
              <div className="mb-4 pb-3 border-b-2 border-foreground">
                <h3 className="text-base font-black uppercase tracking-wide">Processing Status</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-foreground" />
                  <span className="text-muted-foreground">
                    Processing: Document is being indexed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                  <span className="text-muted-foreground">
                    Indexed: Ready for student queries
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-foreground" />
                  <span className="text-muted-foreground">
                    Failed: Error during processing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
