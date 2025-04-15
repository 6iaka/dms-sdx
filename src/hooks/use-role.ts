import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { useAuth } from "@clerk/nextjs";
import { getUserRole } from "~/server/actions/user_action";

const DEFAULT_ROLE: Role = Role.VIEWER;
const DEV_ROLE: Role = Role.ADMINISTRATOR;

export function useRole() {
  const { userId } = useAuth();
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
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
          setRole(DEV_ROLE);
          setLoading(false);
          return;
        }

        const userRole = await getUserRole(userId);
        setRole(userRole ?? DEFAULT_ROLE);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(DEFAULT_ROLE);
      } finally {
        setLoading(false);
      }
    }

    void fetchRole();
  }, [userId]);

  return { role, loading };
} 