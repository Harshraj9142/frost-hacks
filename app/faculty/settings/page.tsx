"use client";

import { motion } from "framer-motion";
import { User, Bell, Shield, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/lib/store";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function FacultySettingsPage() {
  const user = useUserStore((s) => s.user);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </motion.div>

        <motion.div {...fadeInUp} className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <Button className="gradient-primary text-white border-0">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Student query alerts", desc: "Get notified when students ask questions" },
                { label: "Weekly reports", desc: "Receive weekly analytics summaries" },
                { label: "System updates", desc: "Important platform updates and announcements" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <Switch defaultChecked={i < 2} />
                  </div>
                  {i < 2 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">Change Password</Button>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Two-factor authentication</div>
                  <div className="text-xs text-muted-foreground">
                    Add an extra layer of security
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
