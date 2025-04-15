"use client";

import { useAuth } from "@clerk/nextjs";
import { Role } from "@prisma/client";
import { getUserRole } from "~/server/actions/user_action";
import { useQuery } from "@tanstack/react-query";

const ADMIN_ROLE: Role = Role.ADMINISTRATOR;
const EDITOR_ROLE: Role = Role.EDITOR;
const VIEWER_ROLE: Role = Role.VIEWER;

export function usePermissions() {
  const { userId } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["userRole", userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getUserRole(userId);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

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
    loading: isLoading,
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