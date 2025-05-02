import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "~/components/ThemeProvider";
import { cn } from "~/lib/utils";

interface PageDashboardProps {
  accessToken: string;
}

export function PageDashboard({ accessToken }: PageDashboardProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className={cn(
        "rounded-lg shadow p-6",
        theme === "dark" ? "bg-gray-800" : "bg-white"
      )}>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={cn(
            "p-6 rounded-lg",
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          )}>
            <h2 className="text-lg font-semibold mb-2">Welcome</h2>
            <p className={cn(
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            )}>
              {userId ? `User ID: ${userId}` : "Not logged in"}
            </p>
          </div>
          <div className={cn(
            "p-6 rounded-lg",
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          )}>
            <h2 className="text-lg font-semibold mb-2">Theme</h2>
            <p className={cn(
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            )}>
              Current theme: {theme}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 