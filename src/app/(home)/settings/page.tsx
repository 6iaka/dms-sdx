"use client";

import { useAuth } from "@clerk/nextjs";
import { usePermissions } from "~/hooks/usePermissions";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { syncDrive } from "~/server/actions/admin_action";
import { useTheme } from "~/components/ThemeProvider";

export default function SettingsPage() {
  const { userId } = useAuth();
  const { isAdmin, isEditor } = usePermissions();
  const [isSyncing, setIsSyncing] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSyncDrive = async () => {
    if (!isAdmin && !isEditor) {
      toast.error("You don't have permission to sync files");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncDrive();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to sync files");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="grid gap-6">
        {/* Drive Sync Section */}
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Sync</CardTitle>
            <CardDescription>
              Manage your Google Drive synchronization settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Manual Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Manually trigger a sync with Google Drive
                </p>
              </div>
              <Button 
                onClick={handleSyncDrive} 
                disabled={isSyncing || (!isAdmin && !isEditor)}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Customize how content is displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
              <Switch 
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact View</Label>
                <p className="text-sm text-muted-foreground">
                  Show more items in less space
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sync Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when sync operations complete
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 