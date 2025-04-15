"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "~/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

export type UserWithRole = {
  id: string;
  username: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  lastActiveAt: Date | null;
};

export async function getUsers(): Promise<UserWithRole[]> {
  const session = await auth();
  if (!session.userId) throw new Error("Unauthorized");

  // Get all users from Clerk
  const clerk = await clerkClient();
  const response = await clerk.users.getUserList();
  const clerkUsers = response.data;
  
  // Get user roles from our database
  const userRoles = await prisma.userRole.findMany();
  
  // Combine the data
  return clerkUsers.map((clerkUser: User) => {
    const userRole = userRoles.find((role) => role.userId === clerkUser.id);
    
    // Consider user active only if they are currently active
    const isActive = clerkUser.lastActiveAt 
      ? new Date(clerkUser.lastActiveAt).getTime() > Date.now() - 5 * 60 * 1000 
      : false;
    
    return {
      id: clerkUser.id,
      username: clerkUser.username,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      role: userRole?.role ?? Role.VIEWER,
      isActive,
      lastActiveAt: clerkUser.lastActiveAt ? new Date(clerkUser.lastActiveAt) : null,
    };
  });
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await auth();
  if (!session.userId) throw new Error("Unauthorized");

  // Skip admin check in development
  if (process.env.NODE_ENV === "development") {
    await prisma.userRole.upsert({
      where: { userId },
      update: { role },
      create: { userId, role },
    });
    return;
  }

  // Ensure the current user is an administrator in production
  const currentUserRole = await prisma.userRole.findUnique({
    where: { userId: session.userId },
  });
  
  if (currentUserRole?.role !== Role.ADMINISTRATOR) {
    throw new Error("Only administrators can update user roles");
  }

  await prisma.userRole.upsert({
    where: { userId },
    update: { role },
    create: { userId, role },
  });
}

export async function getUserRole(userId: string): Promise<Role | null> {
  try {
    const userRole = await prisma.userRole.findUnique({
      where: { userId },
    });
    return userRole?.role ?? null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
} 