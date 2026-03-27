"use client";

import { create } from "zustand";

export type UserRole = "student" | "faculty";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  studentCount: number;
  documentCount: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: "high" | "medium" | "low";
  citations?: Citation[];
  sources?: any[]; // Full source objects with page info
  hints?: string[];
  explanation?: string;
  example?: string;
  practiceQuestion?: string;
  isOutOfScope?: boolean;
  suggestions?: string[];
  queryLogId?: string; // For feedback tracking
}

export interface Citation {
  id: string;
  fileName: string;
  pageNumber: number;
  snippet: string;
  highlight?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  courseId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// User store
interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: {
    id: "1",
    name: "Alex Chen",
    email: "alex.chen@university.edu",
    role: "student",
    avatar: undefined,
  },
  setUser: (user) => set({ user }),
  setRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, role } : null,
    })),
}));

// Course store
interface CourseStore {
  courses: Course[];
  selectedCourseId: string | null;
  isLoading: boolean;
  setSelectedCourse: (id: string) => void;
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, course: Course) => void;
  removeCourse: (id: string) => void;
  fetchCourses: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
  courses: [],
  selectedCourseId: null,
  isLoading: false,
  setSelectedCourse: (id) => set({ selectedCourseId: id }),
  setCourses: (courses) => set({ courses }),
  addCourse: (course) => set((state) => ({ courses: [...state.courses, course] })),
  updateCourse: (id, course) => 
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? course : c)),
    })),
  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  fetchCourses: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/faculty/courses");
      if (response.ok) {
        const data = await response.json();
        set({ courses: data.courses || [] });
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Chat store
interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  tutorMode: "guided" | "direct";
  isTyping: boolean;
  setActiveSession: (id: string) => void;
  setTutorMode: (mode: "guided" | "direct") => void;
  setIsTyping: (typing: boolean) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  createSession: (courseId: string, title: string) => string;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [
    {
      id: "chat-1",
      title: "Binary Search Trees",
      courseId: "cs101",
      messages: [],
      createdAt: new Date("2025-03-20"),
      updatedAt: new Date("2025-03-20"),
    },
    {
      id: "chat-2",
      title: "Gradient Descent",
      courseId: "ml301",
      messages: [],
      createdAt: new Date("2025-03-19"),
      updatedAt: new Date("2025-03-19"),
    },
    {
      id: "chat-3",
      title: "Eigenvalues & Eigenvectors",
      courseId: "math201",
      messages: [],
      createdAt: new Date("2025-03-18"),
      updatedAt: new Date("2025-03-18"),
    },
  ],
  activeSessionId: "chat-1",
  tutorMode: "direct",
  isTyping: false,
  setActiveSession: (id) => set({ activeSessionId: id }),
  setTutorMode: (mode) => set({ tutorMode: mode }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date() }
          : s
      ),
    })),
  createSession: (courseId, title) => {
    const id = `chat-${Date.now()}`;
    set((state) => ({
      sessions: [
        {
          id,
          title,
          courseId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...state.sessions,
      ],
      activeSessionId: id,
    }));
    return id;
  },
}));

// UI store
interface UIStore {
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  commandPaletteOpen: boolean;
  focusMode: boolean;
  theme: "dark" | "light";
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  toggleCommandPalette: () => void;
  toggleFocusMode: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: false,
  commandPaletteOpen: false,
  focusMode: false,
  theme: "dark",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setTheme: (theme) => set({ theme }),
}));
