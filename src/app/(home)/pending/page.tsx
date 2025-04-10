"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { userService } from "../../../server/services/user_service";

export default function PendingPage() {
  const { userId } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      if (userId) {
        const user = await userService.findByEmail(userId);
        if (user && user.role !== "PENDING") {
          window.location.href = "/";
        }
      }
    };

    checkStatus();
  }, [userId]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Verification Pending</h1>
        <p className="mb-8 text-gray-600">
          Your account is pending verification. An administrator will review your request shortly.
        </p>
        <div className="animate-pulse">
          <div className="h-2 w-20 bg-gray-300 rounded mx-auto mb-2"></div>
          <div className="h-2 w-32 bg-gray-300 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
} 