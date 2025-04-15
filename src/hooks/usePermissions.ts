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

  // Basic permissions
  const canView = true; // Everyone can view
  const canSearch = true; // Everyone can search
  const canViewTags = true; // Everyone can view tags

  // Editor and Admin permissions
  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin || isEditor;
  const canUpload = isAdmin || isEditor;
  const canSync = isAdmin || isEditor;
  const canCreateFolders = isAdmin || isEditor;
  const canSelect = isAdmin || isEditor;
  const canManageTags = isAdmin || isEditor;

  // Admin only permissions
  const canManageUsers = isAdmin;
  const canViewUserManagement = isAdmin;

  return {
    role,
    setRole,
    loading,
    isViewer,
    isEditor,
    isAdmin,
    // Basic permissions
    canView,
    canSearch,
    canViewTags,
    // Editor and Admin permissions
    canEdit,
    canDelete,
    canUpload,
    canSync,
    canCreateFolders,
    canSelect,
    canManageTags,
    // Admin only permissions
    canManageUsers,
    canViewUserManagement,
  };
} 