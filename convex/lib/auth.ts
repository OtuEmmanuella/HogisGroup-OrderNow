import { QueryCtx, MutationCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

/**
 * Helper function to get user identity from Clerk authentication.
 * Throws an error if the user is not authenticated.
 */
export async function getUserFromAuth(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("User must be authenticated.");
    }

    // Fetch the user document based on the Clerk tokenIdentifier
    // Using tokenIdentifier ensures we get the correct Convex user associated with the Clerk user
    const user = await ctx.db
        .query("users")
        .withIndex("by_user_id", (q) => q.eq("userId", identity.subject)) // Use identity.subject which maps to Clerk User ID
        .unique();

    if (!user) {
        // This case should ideally not happen if users are synced correctly
        // but handle it defensively.
        console.error(`Convex user not found for Clerk ID: ${identity.subject}`);
        throw new Error("User profile not found.");
    }

    // Return the Convex user document along with Clerk details if needed
    return {
        ...user,
        // Optionally include Clerk details if useful, but often just the Convex user ID (_id) or Clerk User ID (userId) is needed
        // clerkIdentity: identity
    };
}

/**
 * Checks if the authenticated user is an admin.
 * Throws an error if the user is not authenticated or not an admin.
 */
export async function ensureAdmin(ctx: QueryCtx | MutationCtx) {
    const user = await getUserFromAuth(ctx);

    if (user.role !== "admin") {
        throw new Error("User is not authorized to perform this action.");
    }
    return user; // Return the admin user object if needed
}

// You can add other auth-related helpers here 