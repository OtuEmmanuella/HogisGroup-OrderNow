"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api"; // Import internal here
import { v } from "convex/values";
import { Resend } from 'resend'; // Import Resend

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.warn("RESEND_API_KEY is not set. Email notifications will be disabled.");
}
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    verifiedData: v.object({ // Define a specific schema for Paystack data
      status: v.string(),
      reference: v.string(),
      amount: v.number(), // Paystack amount is usually in kobo/cents (integer)
      metadata: v.optional(v.object({ // Metadata might be optional or structured differently
        orderId: v.optional(v.id("orders")), // Use v.id if it's a Convex Id
        cartId: v.optional(v.id("sharedCarts")), // Use v.id if it's a Convex Id
        userId: v.optional(v.string()), // Assuming userId in metadata is a string (Clerk ID?)
        // Explicitly add fields observed in the payload
        cancel_action: v.optional(v.string()),
        referrer: v.optional(v.string()),
        // v.object allows other fields implicitly
      })),
      // Add other expected top-level fields from Paystack if needed
    }), // Convex v.object allows extra fields by default
  },
  handler: async (ctx, args) => {
    console.log(`[CONVEX Action(webhook_actions:processVerifiedPaystackWebhook)] Received webhook args:`, args);

    if (args.event === "charge.success" && args.verifiedData.status === "success") {
      const { metadata } = args.verifiedData;
      if (!metadata) {
        console.error("No metadata in webhook payload");
        return { success: false, message: "No metadata found in webhook" };
      }

      const orderId = metadata.orderId;
      const cartId = metadata.cartId;
      const userId = metadata.userId;
      const reference = args.verifiedData.reference;
      const amountPaid = args.verifiedData.amount;

      console.log(`[CONVEX Action(webhook_actions:processVerifiedPaystackWebhook)] Processing payment - OrderID: ${orderId}, CartID: ${cartId}, UserID: ${userId}, Reference: ${reference}, Amount: ${amountPaid}`);

      let orderUpdateSuccess = false;
      let orderDetails: any = null; // To store order details for email
      let userDetails: any = null; // To store user details for email
      let branchDetails: any = null; // To store branch details for email

      if (orderId) {
        // --- Handle Regular Order Payment --- 
        console.log(`Webhook Action: Handling payment for regular order ${orderId}`);
        try {
          await ctx.runMutation(internal.orders.internalUpdateOrderStatusFromWebhook, {
            orderId: orderId,
            status: "Received",
            paymentReference: reference,
          });
          console.log(`Webhook Action: Order ${orderId} status updated successfully`);
          orderUpdateSuccess = true;
          // Fetch details needed for email
          orderDetails = await ctx.runQuery(api.orders.getOrderWithDetails, { orderId });
          if (orderDetails) {
            userDetails = await ctx.runQuery(api.users.getUserByClerkId, { userId: orderDetails.userId });
            branchDetails = await ctx.runQuery(api.branches.getById, { branchId: orderDetails.branchId });
          }
        } catch (error) {
          console.error(`Webhook Action: Failed to update order status for ${orderId}:`, error);
          // Don't throw here, allow email attempt if possible, but log failure
          // throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (cartId && userId) {
        // --- Handle Shared Cart Payment --- 
        console.log(`Webhook Action: Handling payment for shared cart ${cartId} by user ${userId}`);
        try {
          await ctx.runMutation(internal.sharedCarts.internalUpdateSharedCartPaymentStatus, {
            cartId: cartId,
            userId: userId,
            paymentReference: reference,
            amountPaid: amountPaid,
          });
          console.log(`Webhook Action: Shared cart ${cartId} member ${userId} payment status updated successfully`);
          orderUpdateSuccess = true;
          // Fetch details needed for email (assuming shared cart converts to an order or has similar details)
          // This part might need adjustment based on how shared carts are structured and finalized
          // For now, let's assume we can get relevant info. If not, email sending might fail later.
          // Example: Fetch the finalized order associated with the cart, or cart details directly
          // orderDetails = await ctx.runQuery(api.orders.getOrderByCartId, { cartId }); // Hypothetical query
          // if (orderDetails) {
          //   userDetails = await ctx.runQuery(api.users.getUserByClerkId, { userId });
          //   branchDetails = await ctx.runQuery(api.branches.getById, { branchId: orderDetails.branchId });
          // }
          console.warn("Email notification for shared cart payment completion is not fully implemented yet. Need logic to fetch final order/cart details.");

        } catch (error) {
          console.error(`Webhook Action: Failed to update shared cart status for cart ${cartId}, user ${userId}:`, error);
          // Don't throw here
          // throw new Error(`Failed to update shared cart status: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        console.error(`Webhook Action: Missing or ambiguous ID (orderId or cartId/userId) in metadata for reference: ${reference}`);
        return { success: false, message: "Missing or ambiguous metadata" };
      }

      // --- Send Email Notifications if order update was successful and Resend is configured ---
      if (orderUpdateSuccess && resend && orderDetails && userDetails && branchDetails) {
        console.log(`Webhook Action: Attempting to send email notifications for order ${orderId || cartId}`);
        
        const customerEmail = userDetails.email;
        const customerName = userDetails.name || 'Valued Customer';
        const branchName = branchDetails.name;
        const orderTotal = (orderDetails.totalAmount || amountPaid / 100).toFixed(2); // Use order total or amount paid
        const orderItems = orderDetails.items?.map((item: any) => `${item.quantity} x ${item.name}`).join('\n') || 'Details unavailable';

        // Determine Branch Email based on branch name/ID (using .env variables)
        let branchEmail = process.env.EMAIL_USER; // Default fallback
        const branch1Name = "Hogis Luxury Suites Branch"; // Match names used in seeding or DB
        const branch2Name = "Hogis Royale & Apartment Branch";
        const branch3Name = "Hogis Exclusive Suites Branch";

        if (branchName === branch1Name && process.env.BRANCH1_EMAIL) {
          branchEmail = process.env.BRANCH1_EMAIL;
        } else if (branchName === branch2Name && process.env.BRANCH2_EMAIL) {
          branchEmail = process.env.BRANCH2_EMAIL;
        } else if (branchName === branch3Name && process.env.BRANCH3_EMAIL) {
          branchEmail = process.env.BRANCH3_EMAIL;
        } else {
            console.warn(`Could not match branch name '${branchName}' to specific branch email env variable. Using default.`);
        }

        const emailSubjectCustomer = `Your Hogis Order Confirmation (#${orderId || reference})`;
        const emailBodyCustomer = `
          <p>Dear ${customerName},</p>
          <p>Thank you for your order! We've received your payment and your order is being processed at ${branchName}.</p>
          <p><strong>Order Reference:</strong> ${orderId || reference}</p>
          <p><strong>Items:</strong></p>
          <pre>${orderItems}</pre>
          <p><strong>Total Amount:</strong> ₦${orderTotal}</p>
          <p>We'll notify you when your order is ready for pickup or out for delivery.</p>
          <p>Thanks,<br/>The Hogis Team</p>
        `;

        const emailSubjectBranch = `New Order Received (#${orderId || reference}) - ${customerName}`;
        const emailBodyBranch = `
          <p>A new order has been received and paid for:</p>
          <p><strong>Order Reference:</strong> ${orderId || reference}</p>
          <p><strong>Customer Name:</strong> ${customerName}</p>
          <p><strong>Customer Email:</strong> ${customerEmail}</p>
          <p><strong>Items:</strong></p>
          <pre>${orderItems}</pre>
          <p><strong>Total Amount:</strong> ₦${orderTotal}</p>
          <p>Please begin preparation.</p>
        `;

        try {
          // Send to Customer
          await resend.emails.send({
            from: `Hogis Order <noreply@${process.env.EMAIL_DOMAIN || 'yourdomain.com'}>`, // Replace with your verified Resend domain
            to: customerEmail,
            subject: emailSubjectCustomer,
            html: emailBodyCustomer,
          });
          console.log(`Webhook Action: Customer confirmation email sent successfully to ${customerEmail}`);

          // Send to Branch
          if (branchEmail) {
            await resend.emails.send({
              from: `Hogis System <noreply@${process.env.EMAIL_DOMAIN || 'yourdomain.com'}>`, // Replace with your verified Resend domain
              to: branchEmail,
              subject: emailSubjectBranch,
              html: emailBodyBranch,
            });
            console.log(`Webhook Action: Branch notification email sent successfully to ${branchEmail}`);
          } else {
            console.warn(`Webhook Action: Branch email not configured or found for ${branchName}. Notification not sent.`);
          }

        } catch (emailError) {
          console.error(`Webhook Action: Failed to send email notifications for order ${orderId || cartId}:`, emailError);
          // Log error but don't fail the webhook processing
        }
      } else if (!resend) {
          console.warn("Resend not configured. Skipping email notifications.");
      } else if (!orderUpdateSuccess) {
          console.warn("Order/Cart update failed. Skipping email notifications.");
      } else {
          console.warn("Could not fetch necessary details (order, user, or branch). Skipping email notifications.");
      }

    }

    return { success: true, message: "Event processed" };
  },
});