import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendEmailViaMcp = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.string(),
    html: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    "use node";
    try {
      const response = await fetch("/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      const data = await response.json();
      console.log("Email sent via HTTP endpoint:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to send email via HTTP endpoint:", error);
      throw new Error(error.message);
    }
  },
});

export const updateUserActivity = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userActivity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userActivity) {
      await ctx.db.patch(userActivity._id, { lastActive: now });
    } else {
      await ctx.db.insert("userActivity", { userId: args.userId, lastActive: now });
    }
  },
});