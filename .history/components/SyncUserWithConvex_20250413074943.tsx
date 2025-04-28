"use client";

import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";

export default function SyncUserWithConvex() {
  const { user, isLoaded } = useUser();
  // Assuming api.users.updateUser exists and handles user creation/update idempotently
  const updateUser = useMutation(api.users.updateUser);
  const updateUserActivity = useMutation(api.actions.updateUserActivity);
  // Removed handleUserCreated action and hasTriggeredWelcome state

  useEffect(() => {
    // Don't run if Clerk user isn't loaded yet
    if (!isLoaded || !user) {
      return;
    }

    const syncUser = async () => {
      try {
        // Attempt to create or update the user in Convex.
        // This mutation should ideally handle both cases (insert if not exists, update if exists).
        await updateUser({
          userId: user.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.emailAddresses[0]?.emailAddress ?? "", // Ensure email is handled correctly if missing
        });
        await updateUserActivity({ userId: user.id });
        // console.log("User synced with Convex:", user.id); // Optional logging
      } catch (error) {
        // Log error but don't crash the app
        console.error("Error syncing user with Convex:", error);
      }
    };

    syncUser();
    // Dependencies: only run when user object changes or loading state finishes
  }, [user, isLoaded, updateUser, updateUserActivity]);

  // This component doesn't render anything
  return null;
}
