import { QueryCtx, MutationCtx } from "../_generated/server";
import { api } from "../_generated/api";

export async function ensureAdmin(ctx: QueryCtx | MutationCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error("User is not authenticated.");
    }

    // Fetch the user document using the identity subject (Clerk User ID)
    // Using runQuery to avoid making ensureAdmin itself a query/mutation
    const user = await ctx.runQuery(api.users.getUserByClerkId, { userId: identity.subject });

    if (!user) {
        // This case might happen if the user record wasn't created properly in Convex yet
        // Or if the user was deleted from Clerk but not Convex
        throw new Error("User record not found in Convex DB.");
    }

    if (user.role !== 'admin') {
        console.warn(`User ${identity.subject} attempted admin action without admin role.`);
        throw new Error("User is not authorized to perform this action.");
    }

    // Optional: Return the admin user object if needed by the caller
    console.log(`Admin action authorized for user: ${identity.subject}`);
    return user;
} 