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
  hints?: string[];
  explanation?: string;
  example?: string;
  practiceQuestion?: string;
  isOutOfScope?: boolean;
  suggestions?: string[];
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
  setSelectedCourse: (id: string) => void;
  setCourses: (courses: Course[]) => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
  courses: [
    {
      id: "cs101",
      name: "Introduction to Computer Science",
      code: "CS 101",
      instructor: "Dr. Sarah Mitchell",
      studentCount: 156,
      documentCount: 24,
      color: "oklch(0.65 0.22 265)",
    },
    {
      id: "ml301",
      name: "Machine Learning Fundamentals",
      code: "ML 301",
      instructor: "Prof. James Liu",
      studentCount: 89,
      documentCount: 18,
      color: "oklch(0.6 0.2 290)",
    },
    {
      id: "math201",
      name: "Linear Algebra",
      code: "MATH 201",
      instructor: "Dr. Emily Park",
      studentCount: 120,
      documentCount: 15,
      color: "oklch(0.7 0.15 240)",
    },
  ],
  selectedCourseId: "cs101",
  setSelectedCourse: (id) => set({ selectedCourseId: id }),
  setCourses: (courses) => set({ courses }),
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
  tutorMode: "guided",
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
