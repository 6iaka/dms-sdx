"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "~/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import type { UserRole } from "@prisma/client";

export type UserWithRole = {
  id: string;
  email: string;
  role: Role;
};

export async function getUsers(): Promise<UserWithRole[]> {
  try {
    const users = await prisma.userRole.findMany({
      select: {
        userId: true,
        role: true,
      },
    });

    return users.map((user) => ({
      id: user.userId,
      email: user.userId, // Using userId as email since we don't have email in UserRole
      role: user.role,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function updateUserRole(userId: string, role: Role): Promise<boolean> {
  try {
    await prisma.userRole.upsert({
      where: { userId },
      update: { role },
      create: { userId, role },
    });
    return true;
  } catch (error) {
    console.error("Error updating user role:", error);
    return false;
  }
}

export async function getUserRole(userId: string): Promise<Role | null> {
  try {
    const userRole = await prisma.userRole.findUnique({
      where: { userId },
      select: { role: true },
    });
    return userRole?.role ?? null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findUnique({
      where: { userId },
      select: { role: true },
    });
    return userRole?.role === Role.ADMINISTRATOR;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
} 