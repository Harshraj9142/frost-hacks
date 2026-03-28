import { jsPDF } from "jspdf";
import type { ChatMessage } from "./store";

// Project theme colors
const THEME = {
  background: "#FFF8F0",
  foreground: "#000000",
  primary: "#FF4500",
  muted: "#F5F5F5",
  border: "#E5E5E5",
  mutedForeground: "#737373",
};

interface ExportOptions {
  courseName?: string;
  courseCode?: string;
  studentName?: string;
  includeTimestamps?: boolean;
  includeSources?: boolean;
}

export function exportChatToPDF(
  messages: ChatMessage[],
  options: ExportOptions = {}
) {
  const {
    courseName = "Course Chat",
    courseCode = "",
    studentName = "Student",
    includeTimestamps = true,
    includeSources = true,
  } = options;

  // Create PDF with A4 size
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add page numbers
  const addPageNumber = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(THEME.mutedForeground);
    doc.text(
      `Page ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  };

  // ===== HEADER =====
  // Background rectangle for header
  doc.setFillColor(THEME.foreground);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Logo/Title
  doc.setTextColor(THEME.background);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("RAG Tutor", margin, 15);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Learning Chat Export", margin, 22);

  // Decorative line
  doc.setDrawColor(THEME.primary);
  doc.setLineWidth(2);
  doc.line(margin, 28, pageWidth - margin, 28);

  yPosition = 50;

  // ===== METADATA SECTION =====
  doc.setFillColor(THEME.muted);
  doc.rect(margin, yPosition, contentWidth, 30, "F");

  doc.setTextColor(THEME.foreground);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // Course info
  doc.text("COURSE", margin + 5, yPosition + 8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${courseCode ? courseCode + " - " : ""}${courseName}`,
    margin + 5,
    yPosition + 14
  );

  // Export info
  doc.setFont("helvetica", "bold");
  doc.text("EXPORTED", margin + 5, yPosition + 20);
  doc.setFont("helvetica", "normal");
  doc.text(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    margin + 5,
    yPosition + 26
  );

  // Student name (right side)
  doc.setFont("helvetica", "bold");
  doc.text("STUDENT", pageWidth - margin - 50, yPosition + 8);
  doc.setFont("helvetica", "normal");
  doc.text(studentName, pageWidth - margin - 50, yPosition + 14);

  // Message count
  doc.setFont("helvetica", "bold");
  doc.text("MESSAGES", pageWidth - margin - 50, yPosition + 20);
  doc.setFont("helvetica", "normal");
  doc.text(`${messages.length} total`, pageWidth - margin - 50, yPosition + 26);

  yPosition += 40;

  // ===== MESSAGES SECTION =====
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(THEME.foreground);
  doc.text("Conversation", margin, yPosition);

  // Decorative underline
  doc.setDrawColor(THEME.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 2, margin + 40, yPosition + 2);

  yPosition += 10;

  // Process each message
  messages.forEach((message, index) => {
    const isUser = message.role === "user";
    const role = isUser ? "YOU" : "AI TUTOR";
    const roleColor = isUser ? THEME.primary : THEME.foreground;

    // Check if we need a new page
    checkPageBreak(30);

    // Message container background
    doc.setFillColor(isUser ? "#FFF0E6" : THEME.muted);
    const messageStartY = yPosition;

    // Role label
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(roleColor);
    doc.text(role, margin + 3, yPosition + 5);

    // Timestamp (if enabled)
    if (includeTimestamps && message.timestamp) {
      const timeStr = new Date(message.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.setTextColor(THEME.mutedForeground);
      doc.text(timeStr, pageWidth - margin - 3, yPosition + 5, {
        align: "right",
      });
    }

    yPosition += 8;

    // Message content
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(THEME.foreground);

    // Split text into lines that fit the width
    const textLines = doc.splitTextToSize(message.content, contentWidth - 10);
    
    // Calculate message height
    const lineHeight = 5;
    const messageHeight = textLines.length * lineHeight + 10;

    // Check if message fits on current page
    if (yPosition + messageHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    // Draw message background
    doc.setFillColor(isUser ? "#FFF0E6" : THEME.muted);
    doc.rect(margin, messageStartY, contentWidth, messageHeight, "F");

    // Draw left border accent
    doc.setFillColor(roleColor);
    doc.rect(margin, messageStartY, 2, messageHeight, "F");

    // Add text
    textLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, margin + 5, yPosition + lineIndex * lineHeight);
    });

    yPosition += textLines.length * lineHeight + 5;

    // Add sources if available and enabled
    if (
      includeSources &&
      !isUser &&
      message.sources &&
      message.sources.length > 0
    ) {
      checkPageBreak(20);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(THEME.mutedForeground);
      doc.text("SOURCES:", margin + 5, yPosition);
      yPosition += 4;

      doc.setFont("helvetica", "normal");
      message.sources.forEach((source: any, sourceIndex: number) => {
        checkPageBreak(8);

        const sourceText = `[${sourceIndex + 1}] ${source.fileName}${
          source.pageInfo && source.pageInfo !== "N/A"
            ? `, ${source.pageInfo}`
            : ""
        } (${(source.score * 100).toFixed(0)}% relevant)`;

        doc.setTextColor(THEME.primary);
        doc.text(sourceText, margin + 8, yPosition);
        yPosition += 4;
      });

      yPosition += 2;
    }

    // Confidence badge (if available)
    if (!isUser && message.confidence) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      const confidenceColor =
        message.confidence === "high"
          ? "#10B981"
          : message.confidence === "medium"
          ? "#F59E0B"
          : "#EF4444";
      doc.setTextColor(confidenceColor);
      doc.text(
        `${message.confidence.toUpperCase()} CONFIDENCE`,
        margin + 5,
        yPosition
      );
      yPosition += 4;
    }

    yPosition += 5; // Space between messages

    // Add separator line
    if (index < messages.length - 1) {
      doc.setDrawColor(THEME.border);
      doc.setLineWidth(0.2);
      doc.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
      yPosition += 5;
    }
  });

  // ===== FOOTER ON LAST PAGE =====
  checkPageBreak(30);
  yPosition += 10;

  doc.setFillColor(THEME.muted);
  doc.rect(margin, yPosition, contentWidth, 20, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(THEME.mutedForeground);
  doc.text(
    "This chat was exported from RAG Tutor - AI-powered learning that teaches, not solves.",
    pageWidth / 2,
    yPosition + 8,
    { align: "center" }
  );

  doc.setFont("helvetica", "bold");
  doc.text(
    "All responses are citation-backed and grounded in course materials.",
    pageWidth / 2,
    yPosition + 14,
    { align: "center" }
  );

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageNumber();
  }

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `RAG-Tutor-Chat-${courseCode || "Course"}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);

  return filename;
}

// Export conversation summary (compact version)
export function exportChatSummaryToPDF(
  messages: ChatMessage[],
  options: ExportOptions = {}
) {
  const {
    courseName = "Course Chat",
    courseCode = "",
    studentName = "Student",
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Header
  doc.setFillColor(THEME.foreground);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(THEME.background);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Chat Summary", margin, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${courseCode} - ${courseName}`, margin, 22);

  yPosition = 45;

  // Statistics
  const userMessages = messages.filter((m) => m.role === "user").length;
  const aiMessages = messages.filter((m) => m.role === "assistant").length;
  const totalSources = messages.reduce(
    (sum, m) => sum + (m.sources?.length || 0),
    0
  );

  doc.setFontSize(10);
  doc.setTextColor(THEME.foreground);
  doc.setFont("helvetica", "bold");
  doc.text("Conversation Statistics", margin, yPosition);
  yPosition += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`• Total Messages: ${messages.length}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`• Your Questions: ${userMessages}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`• AI Responses: ${aiMessages}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(`• Sources Cited: ${totalSources}`, margin + 5, yPosition);
  yPosition += 5;
  doc.text(
    `• Date: ${new Date().toLocaleDateString()}`,
    margin + 5,
    yPosition
  );
  yPosition += 10;

  // Key Topics (extract from user messages)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Your Questions", margin, yPosition);
  yPosition += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  messages
    .filter((m) => m.role === "user")
    .slice(0, 10) // Limit to first 10 questions
    .forEach((msg, index) => {
      if (yPosition > pageHeight - margin - 10) {
        doc.addPage();
        yPosition = margin;
      }

      const questionText = doc.splitTextToSize(
        `${index + 1}. ${msg.content}`,
        contentWidth - 10
      );
      questionText.forEach((line: string) => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 5;
      });
      yPosition += 2;
    });

  // Save
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `RAG-Tutor-Summary-${courseCode || "Course"}-${timestamp}.pdf`;
  doc.save(filename);

  return filename;
}
