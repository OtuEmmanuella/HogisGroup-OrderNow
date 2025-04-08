"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
// import { ConvexProvider } from "convex/react"; // Remove basic provider
import { ConvexProviderWithClerk } from "convex/react-clerk"; // Import Clerk-specific provider
import { ClerkProvider, useAuth } from "@clerk/nextjs"; // Import Clerk provider and useAuth hook

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!); // Ensure this env var is set

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}> {/* Ensure this env var is set */}
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}> {/* Pass useAuth hook */}
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
