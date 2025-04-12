import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Retrieves the authenticated user's identity (Clerk User ID and email) from the context.
 * Returns null if the user is not authenticated.
 *
 * @param ctx - The Convex query or mutation context.
 * @returns An object containing the user's Clerk ID (`userId`) and email, or null if not authenticated.
 */
export const getUserFromAuth = async (ctx: QueryCtx | MutationCtx): Promise<AuthenticatedUserData | null> => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    // Return null instead of throwing for queries that might run unauthenticated
    // Mutations might still want to throw, but queries should often handle null.
    return null;
  }

  // In Clerk, the 'subject' field typically holds the unique User ID.
  const userId = identity.subject;

  if (!userId) {
    // This case might indicate an issue with the Clerk configuration or the identity object structure.
    // Log an error, but still return null for queries.
    console.error("Authentication error: User ID (subject) missing from identity.");
    return null;
  }

  // Return the essential identifier.
  return {
    userId: userId,
    email: identity.email, // Include email if available
  };
};

// Define a type for the returned user object for better type safety
// Note: identity.email might be null depending on Clerk settings/user profile
export type AuthenticatedUserData = {
  userId: string;
  email?: string | null;
};