"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Role } from "@prisma/client";

export function usePermissions() {
  const { userId } = useAuth();
  const [role, setRole] = useState<Role | null>(Role.ADMINISTRATOR);
  const [loading, setLoading] = useState(false);

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