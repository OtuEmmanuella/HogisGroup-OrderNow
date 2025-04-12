import { mutation } from "./_generated/server";
import { query } from "./_generated/server"; // Import query if needed for validation
import { v } from "convex/values";
import { getUserFromAuth } from "./lib/auth"; // Helper to get user identity

/**
 * Submits feedback for a specific completed order.
 * Requires authenticated user.
 */
export const submitFeedback = mutation({
  args: {
    orderId: v.id("orders"),
    comment: v.string(),
    rating: v.optional(v.number()), // Optional rating
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to submit feedback.");
    }

    // 1. Validate the order exists and belongs to the user
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.userId !== user.userId) {
      throw new Error("You can only submit feedback for your own orders.");
    }

    // 2. Optional: Validate order status (e.g., only allow feedback on 'Completed' orders)
    if (order.status.toLowerCase() !== 'completed') {
        throw new Error("Feedback can only be submitted for completed orders.");
    }

    // 3. Optional: Check if feedback already exists for this order
    const existingFeedback = await ctx.db
        .query("feedback")
        .withIndex("by_order", q => q.eq("orderId", args.orderId))
        .first(); // Check if any feedback record exists for this orderId
        
    if (existingFeedback) {
        // Decide behavior: Allow update or prevent duplicate submissions
        // Option 1: Prevent duplicates
         throw new Error("Feedback has already been submitted for this order.");
        // Option 2: Allow update (example)
        // await ctx.db.patch(existingFeedback._id, {
        //     comment: args.comment,
        //     rating: args.rating,
        //     submittedAt: Date.now(),
        // });
        // console.log(`Feedback updated for order ${args.orderId}`);
        // return { success: true, message: "Feedback updated."};
    }

    // 4. Validate comment length
    if (args.comment.trim().length === 0) {
        throw new Error("Feedback comment cannot be empty.");
    }
    if (args.comment.length > 1000) { // Example limit
        throw new Error("Feedback comment is too long (max 1000 characters).");
    }

    // 5. Validate rating (if provided)
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
        throw new Error("Rating must be between 1 and 5.");
    }

    // 6. Insert the feedback
    const feedbackId = await ctx.db.insert("feedback", {
      orderId: args.orderId,
      userId: user.userId,
      comment: args.comment.trim(),
      rating: args.rating,
      submittedAt: Date.now(),
    });

    console.log(`Feedback submitted for order ${args.orderId} by user ${user.userId}`);
    return { success: true, feedbackId };
  },
});

// Optional: Query to get feedback for an order (e.g., to display it)
export const getFeedbackForOrder = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        // Optional: Add authentication check if feedback should be private
        // const user = await getUserFromAuth(ctx);
        // if (!user) { return null; }

        const feedback = await ctx.db
            .query("feedback")
            .withIndex("by_order", q => q.eq("orderId", args.orderId))
            .collect(); // Collect all feedback for the order (usually just one)
            
        // Return the first feedback found, or null
        return feedback.length > 0 ? feedback[0] : null;
    },
});

// Get all feedback for a user's orders
export const getFeedbackForUserOrders = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        // Optional: Add authentication check to ensure user is getting their own feedback
        const user = await getUserFromAuth(ctx);
        if (!user || user.userId !== args.userId) {
            return [];
        }

        // Get all feedback where userId matches
        const feedback = await ctx.db
            .query("feedback")
            .withIndex("by_user", q => q.eq("userId", args.userId))
            .collect();
            
        return feedback;
    },
}); 