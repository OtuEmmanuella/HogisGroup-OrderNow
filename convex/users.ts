import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const newUserId = await ctx.db.insert("users", {
      userId,
      name,
      email,
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

export const getUserByClerkId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    return user; // Returns the whole user object, including the role
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
        role: "customer", // Default new users to 'customer'
      });
    }
  },
});
