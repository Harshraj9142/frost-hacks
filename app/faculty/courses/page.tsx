"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Plus, 
  Users, 
  FileText, 
  Settings, 
  Trash2, 
  BookOpen, 
  Loader2, 
  Database, 
  CheckCircle2,
  Edit,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Upload,
  BarChart3,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCourseStore } from "@/lib/store";

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  studentCount: number;
  documentCount: number;
  indexedCount: number;
  totalChunks: number;
  instructor: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function FacultyCoursesPage() {
  const { data: session } = useSession();
  const { courses, addCourse, updateCourse, removeCourse, isLoading } = useCourseStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    color: "#8b5cf6",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Courses are loaded by CourseLoader component
    // This effect is just for initial load check
  }, [session]);

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" ||
      (filterStatus === "active" && course.indexedCount > 0) ||
      (filterStatus === "inactive" && course.indexedCount === 0);
    
    return matchesSearch && matchesFilter;
  });

  const handleCreateCourse = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/faculty/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      toast.success("Course created successfully!");
      addCourse(data.course);
      setCreateDialogOpen(false);
      setFormData({ code: "", name: "", color: "#8b5cf6" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCourse = async () => {
    if (!selectedCourse || !formData.code || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/faculty/courses/${selectedCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update course");
      }

      toast.success("Course updated successfully!");
      updateCourse(selectedCourse.id, data.course);
      setEditDialogOpen(false);
      setSelectedCourse(null);
      setFormData({ code: "", name: "", color: "#8b5cf6" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/faculty/courses/${selectedCourse.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete course");
      }

      toast.success("Course deleted successfully!");
      removeCourse(selectedCourse.id);
      setDeleteDialogOpen(false);
      setSelectedCourse(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      color: course.color,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (course: Course) => {
    setSelectedCourse(course);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold">Course Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your courses, students, and materials
            </p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 gradient-primary text-white border-0"
          >
            <Plus className="h-4 w-4" /> Create Course
          </Button>
        </motion.div>

        {/* Search and Filter */}
        {!isLoading && courses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30"
              />
            </div>
            <div className="flex gap-2">
              {["all", "active", "inactive"].map((filter) => (
                <Button
                  key={filter}
                  variant={filterStatus === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(filter as any)}
                  className={filterStatus === filter ? "gradient-primary text-white border-0" : ""}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats */}
        {!isLoading && courses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            <div className="feature-box p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-foreground bg-background flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-black">{courses.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Courses</div>
                </div>
              </div>
            </div>
            
            <div className="feature-box p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-foreground bg-background flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-black">
                    {courses.filter(c => c.indexedCount > 0).length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active</div>
                </div>
              </div>
            </div>
            
            <div className="feature-box p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-foreground bg-background flex items-center justify-center">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-black">
                    {courses.reduce((sum, c) => sum + c.documentCount, 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Documents</div>
                </div>
              </div>
            </div>
            
            <div className="feature-box p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-foreground bg-background flex items-center justify-center">
                  <Users className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-black">
                    {courses.reduce((sum, c) => sum + c.studentCount, 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Students</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="feature-box">
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-bold mb-2">No courses found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4 italic" style={{ fontFamily: 'Georgia, serif' }}>
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first course"}
              </p>
              {(searchQuery || filterStatus !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}
                  className="border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase text-xs tracking-wider"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCourses.map((course) => (
              <motion.div key={course.id} variants={fadeInUp}>
                <div className="feature-box group">
                  <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-foreground/20">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 border-2 border-foreground"
                        style={{ backgroundColor: course.color }}
                      />
                      <h3 className="font-black text-base uppercase tracking-wide">{course.code}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.indexedCount > 0 && (
                        <div className="px-2 py-1 border border-foreground/30 bg-background flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="text-[9px] font-bold tracking-wider uppercase">Active</span>
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center justify-center h-7 w-7 border-2 border-foreground/30 hover:border-foreground/50 hover:bg-foreground/5 transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(course)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(course)}
                            className="text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic" style={{ fontFamily: 'Georgia, serif' }}>
                    {course.name}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm pb-3 border-b border-foreground/10">
                      <span className="text-muted-foreground font-semibold">Instructor</span>
                      <span className="font-bold truncate ml-2">{course.instructor}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border-2 border-foreground/20 text-center bg-card">
                        <Users className="h-4 w-4 mx-auto mb-1" />
                        <div className="text-lg font-black">{course.studentCount}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Students</div>
                      </div>
                      <div className="p-3 border-2 border-foreground/20 text-center bg-card">
                        <FileText className="h-4 w-4 mx-auto mb-1" />
                        <div className="text-lg font-black">{course.documentCount}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Documents</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 border-2 border-foreground/20 text-center bg-card">
                        <div className="text-sm font-black">{course.indexedCount}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Indexed</div>
                      </div>
                      <div className="p-2 border-2 border-foreground/20 text-center bg-card">
                        <div className="text-sm font-black">{course.totalChunks}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Chunks</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create Course Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Add a new course to your teaching portfolio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Course Code *</Label>
              <Input
                id="code"
                placeholder="e.g., CS 101"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Introduction to Computer Science"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color">Course Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 rounded-md border border-border cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setFormData({ code: "", name: "", color: "#8b5cf6" });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={isSubmitting || !formData.code || !formData.name}
              className="gradient-primary text-white border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Course Code *</Label>
              <Input
                id="edit-code"
                placeholder="e.g., CS 101"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-name">Course Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Introduction to Computer Science"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-color">Course Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="edit-color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 rounded-md border border-border cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedCourse(null);
                setFormData({ code: "", name: "", color: "#8b5cf6" });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCourse}
              disabled={isSubmitting || !formData.code || !formData.name}
              className="gradient-primary text-white border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course?
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-red-400/5 border border-red-400/20">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-400/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-400 mb-1">
                      {selectedCourse.code} - {selectedCourse.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete the course and all associated data:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• {selectedCourse.documentCount} documents</li>
                      <li>• {selectedCourse.totalChunks} indexed chunks</li>
                      <li>• Student enrollment records</li>
                    </ul>
                    <p className="text-sm text-red-400 mt-3 font-medium">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedCourse(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCourse}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
