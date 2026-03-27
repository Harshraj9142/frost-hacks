"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const studentNavLinks = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/chat", label: "Chat", icon: MessageSquare },
  { href: "/student/documents", label: "Documents", icon: FileText },
  { href: "/student/study", label: "My Study", icon: Sparkles },
  { href: "/student/learn", label: "Learn", icon: BookOpen },
  { href: "/student/analytics", label: "Analytics", icon: BarChart3 },
];

const facultyNavLinks = [
  { href: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faculty/courses", label: "Courses", icon: BookOpen },
  { href: "/faculty/documents", label: "Documents", icon: FileText },
  { href: "/faculty/students", label: "Students", icon: Users },
  { href: "/faculty/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isFaculty = user?.role === "faculty";

  if (pathname === "/" || pathname.includes("/auth")) return null;

  const navLinks = isFaculty ? facultyNavLinks : studentNavLinks;
  const settingsHref = isFaculty ? "/faculty/settings" : "/student/settings";

  return (
    <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 bottom-0 z-40 bg-background/80 backdrop-blur-xl border-r border-border/50">
      <div className="h-14 flex items-center justify-between px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            isFaculty ? "bg-gradient-to-br from-emerald-500 to-cyan-500" : "gradient-primary"
          }`}>
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-sm">RAG Tutor</span>
        </Link>
      </div>

      <div className="px-4 pt-4 pb-2">
        <Badge 
          variant="outline" 
          className={`w-full justify-center text-xs ${
            isFaculty 
              ? "border-emerald-500/30 text-emerald-400" 
              : "border-primary/30 text-primary"
          }`}
        >
          {isFaculty ? "Faculty Portal" : "Student Portal"}
        </Badge>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-10 font-medium ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <Link href={settingsHref}>
          <Button 
            variant={pathname.startsWith(settingsHref) ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-3 h-10 font-medium ${
              pathname.startsWith(settingsHref) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}
