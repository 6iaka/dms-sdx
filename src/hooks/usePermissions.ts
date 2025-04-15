"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type UserRole = "ADMIN" | "EDITOR" | "VIEWER" | "PENDING";

export function usePermissions() {
  const { userId } = useAuth();
  const [role, setRole] = useState<UserRole | null>("ADMIN");
  const [loading, setLoading] = useState(false);

  const canEdit = role === "ADMIN" || role === "EDITOR";
  const canDelete = role === "ADMIN" || role === "EDITOR";
  const canSync = role === "ADMIN" || role === "EDITOR";
  const canManageUsers = role === "ADMIN";
  const canAssignTags = role === "ADMIN" || role === "EDITOR";
  const isAdmin = role === "ADMIN";

  return {
    role,
    loading,
    canEdit,
    canDelete,
    canSync,
    canManageUsers,
    canAssignTags,
    isAdmin
  };
} 