import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import { prisma } from "~/server/db";

export function useRole() {
  const { userId } = useAuth();
  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!userId) return;
      
      try {
        // In development, always return ADMINISTRATOR
        if (process.env.NODE_ENV === "development") {
          setRole(Role.ADMINISTRATOR);
          setLoading(false);
          return;
        }

        const userRole = await prisma.userRole.findUnique({
          where: { userId },
        });
        
        setRole(userRole?.role ?? Role.VIEWER);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(Role.VIEWER);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [userId]);

  return { role, loading };
} 