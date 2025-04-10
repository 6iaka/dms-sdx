import { db } from "../db";
import type { Prisma } from "@prisma/client";

const UserRole = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
  PENDING: "PENDING",
} as const;

type UserRole = typeof UserRole[keyof typeof UserRole];

export const userService = {
  async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
    });
  },

  async getAllUsers() {
    return db.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  },

  async updateRole(id: number, role: UserRole) {
    return db.user.update({
      where: { id },
      data: { role },
    });
  },

  async logoutUser(id: number) {
    return db.user.update({
      where: { id },
      data: {
        lastActive: null,
      },
    });
  },

  async create(email: string, name?: string) {
    return db.user.create({
      data: {
        email,
        name,
        role: "PENDING",
      },
    });
  },

  async getPendingUsers() {
    return db.user.findMany({
      where: {
        role: "PENDING",
      },
    });
  },
}; 