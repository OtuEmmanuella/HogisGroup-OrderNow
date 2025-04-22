"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api"; // Import internal here
import { v } from "convex/values";
// Potentially import email sending utility if needed
// import { sendWelcomeEmail } from "./lib/sendEmail"; 

/**
 * Action triggered when a new user is created or signs in via Clerk webhook.
 * Stores the user in Convex if they don't exist and potentially sends a welcome email.
 */
export const handleUserCreated = action({
  args: {
    userId: v.string(), // Clerk User ID
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Webhook Action: Handling user created/signed in for Clerk User ID: ${args.userId}`);

    // 1. Check if user already exists in Convex users table (using Clerk ID)
    // Correct the property name based on the error message
    const existingUser = await ctx.runQuery(api.users.getUserByClerkId, { userId: args.userId });

    if (!existingUser) {
      console.log(`Webhook Action: User ${args.userId} not found in Convex. Creating new user.`);
      // 2. If user doesn't exist, create them
      // Use the correct mutation name (syncUser)
      await ctx.runMutation(api.users.syncUser, {
        clerkUserId: args.userId,
        email: args.email,
        name: args.name,
        // Add any other default fields for your user schema
      });
      console.log(`Webhook Action: User ${args.userId} created successfully.`);

      // 3. Optionally, send a welcome email (implement sendWelcomeEmail if needed)
      // try {
      //   await sendWelcomeEmail({ to: args.email, name: args.name });
      //   console.log(`Webhook Action: Welcome email initiated for ${args.email}`);
      // } catch (emailError) {
      //   console.error(`Webhook Action: Failed to send welcome email to ${args.email}:`, emailError);
      //   // Decide if this failure should cause the action to throw an error
      // }

    } else {
      console.log(`Webhook Action: User ${args.userId} already exists in Convex.`);
      // Optionally update user details if they've changed (e.g., name)
      // await ctx.runMutation(api.users.updateUser, { clerkId: args.userId, name: args.name });
    }

    return { success: true };
  },
});

// Add other webhook-related actions here if needed

/**
 * Action to process verified Paystack webhook events.
 * Updates order status based on payment confirmation.
 */
export const processVerifiedPaystackWebhook = action({
  args: {
    event: v.string(),
    verifiedData: v.object({
      reference: v.string(),
      status: v.string(),
      amount: v.number(),
      metadata: v.optional(v.object({
        // Accept either orderId OR cartId
        orderId: v.optional(v.id("orders")), // Expecting Convex Order ID for regular orders
        cartId: v.optional(v.id("sharedCarts")), // Expecting Convex Shared Cart ID for group orders
        userId: v.optional(v.string()), // User who paid (relevant for shared carts)
        cancel_action: v.optional(v.string()), // Add optional cancel_action
        referrer: v.optional(v.string()) // Add optional referrer
      })),
      // Use v.any() for the entire customer object to accept any structure
      customer: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`[CONVEX Action(webhook_actions:processVerifiedPaystackWebhook)] Received webhook args: ${JSON.stringify(args, null, 2)}`); // Log entire args object

    console.log(`Webhook Action: Processing verified Paystack event: ${args.event} for reference: ${args.verifiedData.reference}`);

    // Handle successful charge event
    if (args.event === "charge.success" && args.verifiedData.status === "success") {
      const orderId = args.verifiedData.metadata?.orderId;
      const cartId = args.verifiedData.metadata?.cartId;
      const userId = args.verifiedData.metadata?.userId; // User who made the payment
      const reference = args.verifiedData.reference;
      const amountPaid = args.verifiedData.amount;

      console.log(`[CONVEX Action(webhook_actions:processVerifiedPaystackWebhook)] Extracted Metadata - OrderID: ${orderId}, CartID: ${cartId}, UserID: ${userId}, Reference: ${reference}`); // Log extracted IDs

      if (orderId) {
        // --- Handle Regular Order Payment --- 
        console.log(`Webhook Action: Handling payment for regular order ${orderId}.`);
        try {
          // Update order status and include payment reference
          await ctx.runMutation(internal.orders.internalUpdateOrderStatusFromWebhook, {
            orderId: orderId,
            status: "Received", // Or map based on Paystack status if needed
            paymentReference: reference, // Add the payment reference here
          });
          console.log(`Webhook Action: Order ${orderId} status updated successfully.`);
          return { success: true };
        } catch (error) {
          console.error(`Webhook Action: Failed to update order status for ${orderId}:`, error);
          throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
        }

      } else if (cartId && userId) {
        // --- Handle Shared Cart Payment --- 
        console.log(`Webhook Action: Handling payment for shared cart ${cartId} by user ${userId}.`);
        try {
          console.log(`Webhook Action: Updating shared cart ${cartId} member ${userId} status using internal mutation.`);
          // Call the internal mutation to update the shared cart member's status
          await ctx.runMutation(internal.sharedCarts.internalUpdateSharedCartPaymentStatus, {
            cartId: cartId,
            userId: userId,
            paymentReference: reference,
            amountPaid: amountPaid, // Pass amount paid for verification/logging
          });
          console.log(`Webhook Action: Shared cart ${cartId} member ${userId} status updated successfully.`);
          return { success: true };
        } catch (error) {
          console.error(`Webhook Action: Failed to update shared cart status for cart ${cartId}, user ${userId}:`, error);
          throw new Error(`Failed to update shared cart status: ${error instanceof Error ? error.message : String(error)}`);
        }

      } else {
        // --- Handle Missing/Ambiguous Metadata --- 
        console.error(`Webhook Action: Missing or ambiguous ID (orderId or cartId/userId) in metadata for Paystack reference: ${reference}`);
        // Decide if this is a critical error. Maybe log and return success to Paystack?
        // Returning success to avoid Paystack retries for potentially malformed but successful payments.
        return { success: false, message: "Missing or ambiguous orderId/cartId in webhook metadata" };
      }

    } else {
      console.log(`Webhook Action: Received event ${args.event} with status ${args.verifiedData.status}. No action taken.`);
      // Handle other events or statuses if needed (e.g., charge.failed)
    }

    // Acknowledge receipt to Paystack even if no action was taken for this event type
    return { success: true, message: "Event received, no specific action needed for this event/status." };
  },
});