"use client";

import { useEffect, useState } from "react";
import type { UserWithRole } from "~/server/actions/user_action";
import { getUsers, updateUserRole, markUserActive } from "~/server/actions/user_action";
import { Role } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    // Mark current user as active
    if (userId) {
      void markUserActive(userId);
    }
  }, [userId]);

  useEffect(() => {
    void loadUsers().catch((error) => {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    });

    // Refresh user list every 30 seconds
    const interval = setInterval(() => {
      void loadUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const role = Role[newRole as keyof typeof Role];
      if (!role) {
        throw new Error("Invalid role");
      }
      await updateUserRole(userId, role);
      toast.success("User role updated successfully");
      await loadUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error("Failed to update user role");
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-white">User Management</h1>
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {user.username || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger className="w-[180px] bg-gray-700 text-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white">
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                      <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive
                        ? "bg-green-900 text-green-300"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 