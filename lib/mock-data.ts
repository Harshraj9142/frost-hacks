import { ChatMessage, Citation } from "./store";

export const mockCitations: Citation[] = [
  {
    id: "cite-1",
    fileName: "data_structures_ch5.pdf",
    pageNumber: 42,
    snippet:
      "A Binary Search Tree (BST) is a node-based binary tree data structure where each node has at most two children...",
    highlight:
      "The left subtree of a node contains only nodes with keys lesser than the node's key.",
  },
  {
    id: "cite-2",
    fileName: "algorithms_notes.pdf",
    pageNumber: 18,
    snippet:
      "The time complexity of search operation in BST is O(h) where h is the height of the tree...",
  },
  {
    id: "cite-3",
    fileName: "lecture_slides_week7.pdf",
    pageNumber: 5,
    snippet:
      "Balanced BSTs maintain O(log n) height, ensuring efficient operations...",
  },
];

export const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Can you explain how binary search trees work?",
    timestamp: new Date("2025-03-20T10:00:00"),
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "Great question! Let me guide you through understanding Binary Search Trees step by step.",
    timestamp: new Date("2025-03-20T10:00:05"),
    confidence: "high",
    citations: [mockCitations[0], mockCitations[1]],
    hints: [
      "Think about how you would organize a phone book. What property makes it easy to look up names?",
      "In a BST, every node follows a specific ordering rule with respect to its children. Can you guess what that rule might be?",
    ],
    explanation:
      "A Binary Search Tree is a hierarchical data structure where each node has at most two children. The key property is that for every node, all values in its left subtree are smaller, and all values in its right subtree are larger. This ordering property enables efficient searching — similar to how binary search works on a sorted array, but in a tree structure.",
    example:
      "Consider inserting the values [8, 3, 10, 1, 6, 14, 4, 7, 13] into a BST:\n\n```\n        8\n       / \\\n      3   10\n     / \\    \\\n    1   6    14\n       / \\   /\n      4   7 13\n```\n\nTo search for 7: Start at 8 (go left) → 3 (go right) → 6 (go right) → 7 ✓",
    practiceQuestion:
      "Given a BST, what would be the time complexity of searching for an element in the worst case? What kind of tree structure would cause this worst case?",
    suggestions: [
      "How does insertion work in a BST?",
      "What's the difference between BST and AVL tree?",
      "Can you show me BST traversal methods?",
    ],
  },
];

export const mockOutOfScopeMessage: ChatMessage = {
  id: "msg-oos",
  role: "assistant",
  content:
    "I noticed this question appears to be outside your current course materials.",
  timestamp: new Date(),
  isOutOfScope: true,
  confidence: "low",
  suggestions: [
    "How do hash tables compare to BSTs for lookups?",
    "What are the applications of BSTs in databases?",
    "Explain tree balancing algorithms from the course notes",
  ],
};

export const mockAnalyticsData = {
  queryFrequency: [
    { day: "Mon", queries: 45 },
    { day: "Tue", queries: 62 },
    { day: "Wed", queries: 78 },
    { day: "Thu", queries: 54 },
    { day: "Fri", queries: 89 },
    { day: "Sat", queries: 23 },
    { day: "Sun", queries: 34 },
  ],
  topicDifficulty: [
    { topic: "Recursion", difficulty: 0.85, queries: 120 },
    { topic: "Dynamic Programming", difficulty: 0.92, queries: 89 },
    { topic: "Graph Theory", difficulty: 0.78, queries: 76 },
    { topic: "Sorting", difficulty: 0.35, queries: 45 },
    { topic: "Trees", difficulty: 0.65, queries: 98 },
    { topic: "Hash Tables", difficulty: 0.42, queries: 56 },
    { topic: "Linked Lists", difficulty: 0.28, queries: 34 },
    { topic: "Heaps", difficulty: 0.72, queries: 67 },
  ],
  studentQuestions: [
    {
      id: "q1",
      student: "Jamie K.",
      question: "Why does my recursive function exceed the call stack?",
      topic: "Recursion",
      confidence: "low" as const,
      timestamp: "2 hours ago",
    },
    {
      id: "q2",
      student: "Morgan T.",
      question: "How does memoization improve DP solutions?",
      topic: "Dynamic Programming",
      confidence: "medium" as const,
      timestamp: "3 hours ago",
    },
    {
      id: "q3",
      student: "Casey R.",
      question: "What's the difference between BFS and DFS?",
      topic: "Graph Theory",
      confidence: "high" as const,
      timestamp: "5 hours ago",
    },
    {
      id: "q4",
      student: "Taylor M.",
      question: "When should I use QuickSort vs MergeSort?",
      topic: "Sorting",
      confidence: "high" as const,
      timestamp: "6 hours ago",
    },
    {
      id: "q5",
      student: "Riley P.",
      question: "How do Red-Black trees maintain balance?",
      topic: "Trees",
      confidence: "medium" as const,
      timestamp: "1 day ago",
    },
  ],
};

export const mockFlashcards = [
  {
    id: "fc-1",
    front: "What is the time complexity of searching in a balanced BST?",
    back: "O(log n) — because the tree height is log n, and each comparison eliminates half the remaining nodes.",
    topic: "Trees",
    mastered: false,
  },
  {
    id: "fc-2",
    front: "Define Big-O notation",
    back: "Big-O describes the upper bound of an algorithm's growth rate. It gives the worst-case time complexity as a function of input size n.",
    topic: "Algorithms",
    mastered: true,
  },
  {
    id: "fc-3",
    front: "What is a hash collision?",
    back: "A hash collision occurs when two different keys produce the same hash value, mapping to the same bucket in a hash table.",
    topic: "Hash Tables",
    mastered: false,
  },
  {
    id: "fc-4",
    front: "Explain the difference between a stack and a queue",
    back: "Stack: LIFO (Last In, First Out) — push/pop from top.\nQueue: FIFO (First In, First Out) — enqueue at back, dequeue from front.",
    topic: "Data Structures",
    mastered: false,
  },
];

export const mockQuizQuestions = [
  {
    id: "quiz-1",
    question: "What is the worst-case time complexity of QuickSort?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctIndex: 2,
    explanation:
      "QuickSort has O(n²) worst-case when the pivot selection consistently results in the most unbalanced partition.",
  },
  {
    id: "quiz-2",
    question: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Binary Tree", "Hash Table"],
    correctIndex: 1,
    explanation:
      "A Queue follows First-In-First-Out: the first element added is the first one removed.",
  },
  {
    id: "quiz-3",
    question: "In a min-heap, the root element is:",
    options: [
      "The largest element",
      "The median element",
      "The smallest element",
      "A random element",
    ],
    correctIndex: 2,
    explanation:
      "In a min-heap, the parent is always smaller than its children, so the root holds the minimum value.",
  },
];

export const mockStudyPlan = [
  {
    day: "Monday",
    tasks: [
      { title: "Review BST operations", duration: "45 min", completed: true },
      { title: "Practice tree traversals", duration: "30 min", completed: true },
    ],
  },
  {
    day: "Tuesday",
    tasks: [
      { title: "Study graph representations", duration: "60 min", completed: false },
      { title: "BFS & DFS exercises", duration: "45 min", completed: false },
    ],
  },
  {
    day: "Wednesday",
    tasks: [
      { title: "Dynamic programming intro", duration: "60 min", completed: false },
      { title: "Memoization examples", duration: "30 min", completed: false },
    ],
  },
  {
    day: "Thursday",
    tasks: [
      { title: "Review hash tables", duration: "45 min", completed: false },
      { title: "Collision resolution methods", duration: "30 min", completed: false },
    ],
  },
  {
    day: "Friday",
    tasks: [
      { title: "Mixed practice problems", duration: "60 min", completed: false },
      { title: "Weekly quiz review", duration: "30 min", completed: false },
    ],
  },
];

export const mockTopicProgress = [
  { topic: "Arrays & Strings", progress: 92, status: "mastered" as const },
  { topic: "Linked Lists", progress: 85, status: "mastered" as const },
  { topic: "Stacks & Queues", progress: 78, status: "learning" as const },
  { topic: "Trees", progress: 60, status: "learning" as const },
  { topic: "Graphs", progress: 35, status: "weak" as const },
  { topic: "Dynamic Programming", progress: 20, status: "weak" as const },
  { topic: "Hash Tables", progress: 70, status: "learning" as const },
  { topic: "Sorting Algorithms", progress: 88, status: "mastered" as const },
];

export const mockFiles = [
  {
    id: "file-1",
    name: "data_structures_ch5.pdf",
    size: "2.4 MB",
    status: "indexed" as const,
    uploadedAt: "2 days ago",
    pages: 45,
  },
  {
    id: "file-2",
    name: "algorithms_notes.pdf",
    size: "1.8 MB",
    status: "indexed" as const,
    uploadedAt: "3 days ago",
    pages: 32,
  },
  {
    id: "file-3",
    name: "lecture_slides_week7.pdf",
    size: "5.1 MB",
    status: "processing" as const,
    uploadedAt: "Just now",
    pages: 28,
  },
  {
    id: "file-4",
    name: "homework_3_solutions.pdf",
    size: "890 KB",
    status: "indexed" as const,
    uploadedAt: "1 week ago",
    pages: 12,
  },
];

export const mockTestimonials = [
  {
    name: "Dr. Sarah Mitchell",
    role: "Professor of CS, Stanford",
    quote:
      "This tool transformed how my students engage with course material. The Socratic approach means they actually learn, not just get answers.",
    avatar: "SM",
  },
  {
    name: "James Liu",
    role: "PhD Student, MIT",
    quote:
      "The citation system is incredible. Every answer is grounded in our actual course notes, not hallucinated content.",
    avatar: "JL",
  },
  {
    name: "Emily Park",
    role: "Undergraduate, CMU",
    quote:
      "I went from struggling with algorithms to acing my midterm. The guided hints helped me build real understanding.",
    avatar: "EP",
  },
];
