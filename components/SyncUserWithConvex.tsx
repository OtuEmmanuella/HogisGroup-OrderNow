"use client";

import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useMutation, useAction } from "convex/react";
import { useEffect, useState } from "react";

export default function SyncUserWithConvex() {
  const { user, isLoaded } = useUser();
  const updateUser = useMutation(api.users.updateUser);
  const handleUserCreated = useAction(api.webhook_actions.handleUserCreated);
  const [hasTriggeredWelcome, setHasTriggeredWelcome] = useState(false);

  useEffect(() => {
    if (!user || !isLoaded) return;

    const syncUser = async () => {
      try {
        // Sync user data with Convex
        await updateUser({
          userId: user.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.emailAddresses[0]?.emailAddress ?? "",
        });

        // As a fallback, also trigger welcome email directly if not already sent
        if (!hasTriggeredWelcome) {
          const email = user.emailAddresses[0]?.emailAddress;
          if (email) {
            await handleUserCreated({
              userId: user.id,
              email: email,
              name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
            });
            setHasTriggeredWelcome(true);
          }
        }
      } catch (error) {
        console.error("Error syncing user:", error);
      }
    };

    syncUser();
  }, [user, isLoaded, updateUser, handleUserCreated, hasTriggeredWelcome]);

  return null;
}
