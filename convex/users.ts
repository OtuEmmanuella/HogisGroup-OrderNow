import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getUserFromAuth } from "./lib/auth"; // Import getUserFromAuth
import { api, internal } from "./_generated/api"; // Import internal

export const getUsersPaystackSubaccountId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("paystackSubaccountId"), undefined))
      .first();
    return user?.paystackSubaccountId;
  },
});

export const updateOrCreateUserPaystackSubaccountId = mutation({
  args: { userId: v.string(), paystackSubaccountId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { paystackSubaccountId: args.paystackSubaccountId });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, name, email }) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name,
        email,
      });
      return existingUser._id;
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", { // <-- Check this insert
      userId,
      name,
      email,
      credits: 0,
      paystackSubaccountId: undefined,
    });

    return newUserId;
  },
});

export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return user;
  },
});

// Get user by Clerk ID (internal helper, used by webhook)
export const getUserByClerkIdInternal = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        return await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .unique();
    },
});

// Create user (internal helper, used by webhook)
export const createUserInternal = internalMutation({
    args: {
        userId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    },
    handler: async (ctx, { userId, email, name, imageUrl, role }) => {
        await ctx.db.insert("users", {
            userId,
            email,
            name: name ?? "",
            imageUrl,
            credits: 0,
            role: role ?? "customer",
        });
    },
});

// Update user (internal helper, used by webhook)
export const updateUserInternal = internalMutation({
    args: {
        userId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, { userId, ...updates }) => {
        const user = await ctx.runQuery(internal.users.getUserByClerkIdInternal, { userId });
        if (!user) {
            throw new Error("User not found, cannot update");
        }
        await ctx.db.patch(user._id, updates);
    },
});

// Delete user (internal helper, used by webhook)
export const deleteUserInternal = internalMutation({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        const user = await ctx.runQuery(internal.users.getUserByClerkIdInternal, { userId });
        if (!user) {
            console.warn("User not found for deletion, skipping.");
            return; // Or throw error if deletion must succeed
        }
        await ctx.db.delete(user._id);
    },
});

// Public query to get current user's data (if authenticated)
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
         return await getUserFromAuth(ctx); // Reuse auth helper
    },
});

// --- Potentially remove or secure this if not needed ---
// Get user by Clerk ID (public, might expose internal details)
// Consider if this needs to be public or if getCurrentUser is sufficient
export const getUserByClerkId = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
        // Add auth check? Or make internal?
        const user = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .unique();
        return user;
    },
});

// Function to ensure user exists in Convex, creating or updating as needed
// (Keep existing sync logic if present, or add this)
export const syncUser = mutation({
  args: { clerkUserId: v.string(), name: v.string(), email: v.string() },
  handler: async (ctx, { clerkUserId, name, email }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkUserId))
      .first();

    if (existingUser) {
      // Optional: Update name/email if changed in Clerk
      if (existingUser.name !== name || existingUser.email !== email) {
        await ctx.db.patch(existingUser._id, { name, email });
      }
      return existingUser._id;
    } else {
      // Create new user, defaulting role to 'customer'
      return await ctx.db.insert("users", {
        userId: clerkUserId,
        name: name,
        email: email,
        credits: 0,
        role: "customer",
      });
    }
  },
});

export const getActiveUsers = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Define a threshold for considering a user "active" (e.g., last 30 minutes)
    const activeThreshold = now - (30 * 60 * 1000); // 30 minutes ago

    const activeUsers = await ctx.db
      .query("userActivity")
      .filter((q) => q.gte(q.field("lastActive"), activeThreshold))
      .collect();

    return activeUsers;
  },
});
