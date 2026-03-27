"use client";

import { motion } from "framer-motion";
import {
  Settings,
  User,
  Shield,
  Palette,
  Bell,
  Moon,
  Sun,
  GraduationCap,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserStore, useUIStore } from "@/lib/store";

export default function SettingsPage() {
  const user = useUserStore((s) => s.user);
  const setRole = useUserStore((s) => s.setRole);
  const { theme, setTheme } = useUIStore();

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <Settings className="h-6 w-6" />
            SETTINGS
          </h1>
          <p className="text-sm mt-1">
            Manage your account and preferences
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="feature-box">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase font-bold tracking-wider flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 border-[3px] border-foreground flex items-center justify-center text-xl font-bold font-serif">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h3 className="font-medium">{user?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase font-bold tracking-wider">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold tracking-wider">Full Name</Label>
                    <Input
                      defaultValue={user?.name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold tracking-wider">Email</Label>
                    <Input
                      defaultValue={user?.email || ""}
                    />
                  </div>
                </div>
                <Button size="sm">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Role Switch */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="feature-box">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase font-bold tracking-wider flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={user?.role}
                  onValueChange={(v) => setRole(v as "student" | "faculty")}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="feature-box">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase font-bold tracking-wider flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">
                        Toggle between light and dark theme
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => {
                      setTheme(checked ? "dark" : "light");
                      document.documentElement.classList.toggle(
                        "dark",
                        checked
                      );
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="feature-box">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase font-bold tracking-wider flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Share learning progress with instructor",
                    desc: "Allow your professor to see your progress",
                    defaultChecked: true,
                  },
                  {
                    label: "Email notifications",
                    desc: "Receive daily learning reminders",
                    defaultChecked: false,
                  },
                  {
                    label: "Anonymous analytics",
                    desc: "Help improve the platform with anonymous usage data",
                    defaultChecked: true,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Button
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" /> SIGN OUT
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
