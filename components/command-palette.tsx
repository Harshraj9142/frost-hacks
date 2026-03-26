"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  BookOpen,
  Users,
  Search,
  Settings,
  Moon,
  Sun,
  GraduationCap,
} from "lucide-react";
import { useUIStore } from "@/lib/store";

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette, theme, setTheme } =
    useUIStore();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggleCommandPalette]);

  const navigate = (path: string) => {
    router.push(path);
    toggleCommandPalette();
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={toggleCommandPalette}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/chat")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat with Tutor
          </CommandItem>
          <CommandItem onSelect={() => navigate("/learn")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Learning Playground
          </CommandItem>
          <CommandItem onSelect={() => navigate("/analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </CommandItem>
          <CommandItem onSelect={() => navigate("/collab")}>
            <Users className="mr-2 h-4 w-4" />
            Collaboration
          </CommandItem>
          <CommandItem onSelect={() => navigate("/search")}>
            <Search className="mr-2 h-4 w-4" />
            Search Documents
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              document.documentElement.classList.toggle("dark");
              toggleCommandPalette();
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Toggle Theme
          </CommandItem>
          <CommandItem onSelect={() => navigate("/chat")}>
            <GraduationCap className="mr-2 h-4 w-4" />
            New Chat Session
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
