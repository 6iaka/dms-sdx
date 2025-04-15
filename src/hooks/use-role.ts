import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import { getUserRole } from "~/server/actions/user_action";

export function useRole() {
  const { userId } = useAuth();
  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      try {
        // In development, always return ADMINISTRATOR
        if (process.env.NODE_ENV === "development") {
          setRole(Role.ADMINISTRATOR);
          setLoading(false);
          return;
        }

        const userRole = await getUserRole(userId);
        setRole(userRole ?? Role.VIEWER);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(Role.VIEWER);
      } finally {
        setLoading(false);
      }
    }

    void fetchRole();
  }, [userId]);

  return { role, loading };
} 