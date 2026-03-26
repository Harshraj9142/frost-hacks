import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppLayout } from "@/components/app-layout";
import { CommandPalette } from "@/components/command-palette";
import { CourseLoader } from "@/components/course-loader";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG Tutor — Your AI Tutor That Teaches, Not Solves",
  description:
    "Context-aware, course-restricted AI tutor using Socratic questioning. Built for universities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <CourseLoader />
          <div className="flex min-h-screen">
            <AppLayout>{children}</AppLayout>
          </div>
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
