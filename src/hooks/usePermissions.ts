"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { getUserRole } from "~/server/actions/user_action";

const ADMIN_ROLE: Role = Role.ADMINISTRATOR;
const EDITOR_ROLE: Role = Role.EDITOR;

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

  const canEdit = role === ADMIN_ROLE || role === EDITOR_ROLE;
  const canDelete = role === ADMIN_ROLE || role === EDITOR_ROLE;
  const canSync = role === ADMIN_ROLE || role === EDITOR_ROLE;
  const canManageUsers = role === ADMIN_ROLE;
  const canAssignTags = role === ADMIN_ROLE || role === EDITOR_ROLE;
  const isAdmin = role === ADMIN_ROLE;

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