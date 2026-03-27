"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";

const studentLinks = [
  { href: "/student/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/student/chat", icon: MessageSquare, label: "Chat" },
  { href: "/student/study", icon: Sparkles, label: "Study" },
  { href: "/student/analytics", icon: BarChart3, label: "Stats" },
  { href: "/student/settings", icon: Settings, label: "More" },
];

const facultyLinks = [
  { href: "/faculty/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/faculty/courses", icon: BookOpen, label: "Courses" },
  { href: "/faculty/documents", icon: FileText, label: "Docs" },
  { href: "/faculty/students", icon: Users, label: "Students" },
  { href: "/faculty/settings", icon: Settings, label: "More" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const isFaculty = user?.role === "faculty";

  if (pathname === "/" || pathname.includes("/auth")) return null;

  const links = isFaculty ? facultyLinks : studentLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <link.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
