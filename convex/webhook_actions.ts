"use node"; // Actions can use node if needed, though not strictly required here

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Public action called by the Paystack webhook handler (Next.js route) 
 * after a successful charge event is verified.
 *
 * This action finds the corresponding order using the Paystack reference 
 * and updates its status via internal functions.
 */
export const handleSuccessfulPayment = action({
    args: {
        paystackReference: v.string(),
    },
    handler: async (ctx, { paystackReference }): Promise<{ success: boolean; message: string; orderId?: string }> => {
        console.log(`[CONVEX ACTION(handleSuccessfulPayment)] Processing reference: ${paystackReference}`);

        try {
            // 1. Find the order using the reference (internal query)
            const order = await ctx.runQuery(internal.orders.getOrderByPaystackReference, {
                paystackReference: paystackReference 
            });

            if (!order) {
                // Acknowledge, but indicate order not found. Webhook handler should return 200 OK.
                console.warn(`[CONVEX ACTION(handleSuccessfulPayment)] Order not found for Paystack reference: ${paystackReference}.`);
                return { success: false, message: "Order not found for reference." }; 
            }

            // 2. Check if order is already processed (idempotency)
            if (order.status !== 'Pending Confirmation') {
                console.log(`[CONVEX ACTION(handleSuccessfulPayment)] Order ${order._id} (ref: ${paystackReference}) already processed (status: ${order.status}).`);
                // Indicate success as the payment was likely processed before.
                return { success: true, message: "Order already processed.", orderId: order._id }; 
            }

            // 3. Update order status using internal mutation
            console.log(`[CONVEX ACTION(handleSuccessfulPayment)] Updating order ${order._id} status to Received.`);
            await ctx.runMutation(internal.orders.updateOrderStatusInternal, {
                orderId: order._id, 
                status: "Received" // Set status to Received upon successful payment
            });
            console.log(`[CONVEX ACTION(handleSuccessfulPayment)] Successfully updated order ${order._id} status.`);
            
            return { success: true, message: "Order status updated successfully.", orderId: order._id };

        } catch (error: unknown) {
            console.error(`[CONVEX ACTION(handleSuccessfulPayment)] Error processing reference ${paystackReference}:`, error);
             // Indicate failure, webhook handler should return 500.
            return { success: false, message: error instanceof Error ? error.message : "An internal error occurred." };
        }
    },
});

/**
 * Public action called by the Clerk webhook handler (Next.js route)
 * after a user creation event is verified.
 *
 * This action sends a welcome email to the new user and ensures
 * the user is properly synced with Convex.
 */
export const handleUserCreated = action({
    args: {
        userId: v.string(),
        email: v.string(),
        name: v.string(),
    },
    handler: async (ctx, { userId, email, name }): Promise<{ success: boolean; message: string }> => {
        console.log(`[CONVEX ACTION(handleUserCreated)] Processing user creation: ${userId}`);

        try {
            // 1. Ensure user exists in Convex database
            await ctx.runMutation(api.users.syncUser, {
                clerkUserId: userId,
                name: name,
                email: email,
            });
            console.log(`[CONVEX ACTION(handleUserCreated)] User ${userId} synced with Convex.`);

            // 2. Send welcome email
            const emailResult = await ctx.runAction(api.email.sendWelcomeEmail, {
                userId,
                email,
                name,
            });

            if (!emailResult.success) {
                console.warn(`[CONVEX ACTION(handleUserCreated)] Failed to send welcome email to ${email}: ${emailResult.message}`);
                return { success: false, message: `User synced but email failed: ${emailResult.message}` };
            }

            console.log(`[CONVEX ACTION(handleUserCreated)] Welcome email sent to ${email}.`);
            return { success: true, message: "User created and welcome email sent successfully." };

        } catch (error: unknown) {
            console.error(`[CONVEX ACTION(handleUserCreated)] Error processing user ${userId}:`, error);
            return { success: false, message: error instanceof Error ? error.message : "An internal error occurred." };
        }
    },
});