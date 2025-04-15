"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { getUserRole } from "~/server/actions/user_action";

export function usePermissions() {
  const { userId } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userRole = await getUserRole(userId);
        setRole(userRole);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchRole();
  }, [userId]);

  const canEdit = role === Role.ADMINISTRATOR || role === Role.EDITOR;
  const canDelete = role === Role.ADMINISTRATOR || role === Role.EDITOR;
  const canSync = role === Role.ADMINISTRATOR || role === Role.EDITOR;
  const canManageUsers = role === Role.ADMINISTRATOR;
  const canAssignTags = role === Role.ADMINISTRATOR || role === Role.EDITOR;
  const isAdmin = role === Role.ADMINISTRATOR;

  return {
    role,
    setRole,
    loading,
    canEdit,
    canDelete,
    canSync,
    canManageUsers,
    canAssignTags,
    isAdmin
  };
} 