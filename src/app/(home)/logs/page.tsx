"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "../../../server/services/user_service";
import { Button } from "~/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { MoreVertical, LogOut, Eye, Edit2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

type User = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  lastActive: Date | null;
  createdAt: Date;
};

export default function LogsPage() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAllUsers()
  });

  const handleRoleChange = async (userId: number, newRole: "EDITOR" | "VIEWER") => {
    try {
      await userService.updateRole(userId, newRole);
      toast.success("User role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const handleLogout = async (userId: number) => {
    try {
      await userService.logoutUser(userId);
      toast.success("User logged out successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (error) {
      toast.error("Failed to log out user");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="space-y-4">
        {users?.map((user: User) => (
          <div key={user.id} className="flex items-center justify-between p-4 border rounded">
            <div>
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400">
                Last active: {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}
              </p>
              <p className="text-xs text-gray-400">
                Joined: {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${
                user.role === "ADMIN" ? "bg-purple-100 text-purple-800" :
                user.role === "EDITOR" ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {user.role}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, "VIEWER")}>
                    <Eye className="mr-2 h-4 w-4" />
                    Set as Viewer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, "EDITOR")}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Set as Editor
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleLogout(user.id)}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Force Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 