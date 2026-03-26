"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Menu,
  Command,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const { toggleSidebar, toggleCommandPalette } = useUIStore();
  const { data: session } = useSession();
  const user = session?.user;
  const isFaculty = user?.role === "faculty";

  if (pathname === "/" || pathname.includes("/auth")) return null;

  const settingsHref = isFaculty ? "/faculty/settings" : "/student/settings";

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 h-14 glass-strong border-b border-border/50"
    >
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isFaculty ? "bg-gradient-to-br from-emerald-500 to-cyan-500" : "gradient-primary"
            }`}>
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">
              RAG Tutor
            </span>
          </Link>
        </div>
        <div className="hidden md:block"></div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-2 text-xs text-muted-foreground"
            onClick={toggleCommandPalette}
          >
            <Command className="h-3 w-3" />
            <span>⌘K</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className={isFaculty ? "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white" : "gradient-primary text-white"}>
                  {user?.name?.split(" ").map((n) => n[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={settingsHref} className="cursor-pointer">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
