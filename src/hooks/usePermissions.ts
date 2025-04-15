"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { getUserRole } from "~/server/actions/user_action";

const ADMIN_ROLE: Role = Role.ADMINISTRATOR;
const EDITOR_ROLE: Role = Role.EDITOR;
const VIEWER_ROLE: Role = Role.VIEWER;

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

  const isViewer = role === VIEWER_ROLE;
  const isEditor = role === EDITOR_ROLE;
  const isAdmin = role === ADMIN_ROLE;

  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin || isEditor;
  const canUpload = isAdmin || isEditor;
  const canSync = isAdmin || isEditor;
  const canManageUsers = isAdmin;
  const canAssignTags = isAdmin || isEditor;
  const canViewUserManagement = isAdmin;

  return {
    role,
    setRole,
    loading,
    isViewer,
    isEditor,
    isAdmin,
    canEdit,
    canDelete,
    canUpload,
    canSync,
    canManageUsers,
    canAssignTags,
    canViewUserManagement,
  };
} 