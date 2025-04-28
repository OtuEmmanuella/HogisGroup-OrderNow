"use node"; // Required for using Node.js modules like 'crypto'

// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api"; // Import api for scheduling actions
import type { Id } from "./_generated/dataModel";
import crypto from "crypto";

const http = httpRouter();

http.route({
  path: "/paystackWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY environment variable not set.");
      return new Response("Webhook Key configuration error", { status: 500 });
    }

    // Verify the signature
    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
        console.warn("Webhook Error: Missing x-paystack-signature header");
        return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text(); // Read body as text for verification

    try {
        const hash = crypto
            .createHmac('sha512', secret)
            .update(body)
            .digest('hex');
        
        if (hash !== signature) {
            console.warn("Webhook Error: Invalid signature");
            return new Response("Invalid signature", { status: 400 });
        }
    } catch (error) {
        console.error("Webhook Error: Signature verification failed", error);
        return new Response("Signature verification failed", { status: 400 });
    }

    // Parse the verified body
    let event;
    try {
        event = JSON.parse(body);
        console.log("Webhook received event:", event.event); 
    } catch (error) {
        console.error("Webhook Error: Failed to parse request body", error);
        return new Response("Invalid payload", { status: 400 });
    }

    // Handle the event
    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data?.reference;
      const metadata = data?.metadata;
      const orderId = metadata?.orderId; // Make sure 'orderId' is in your metadata

      console.log(`Webhook: charge.success received for reference: ${reference}, orderId: ${orderId}`);

      if (!orderId) {
        console.warn("Webhook Warning: charge.success event missing orderId in metadata.");
        // Decide if you want to return 200 still or an error
        return new Response("Missing orderId in metadata", { status: 400 }); 
      }
      
      if (!reference) {
         console.warn(`Webhook Warning: charge.success event missing reference for orderId: ${orderId}.`);
         // Decide if you want to return 200 still or an error
         return new Response("Missing payment reference", { status: 400 }); 
      }

      try {
        // Update order status via internal mutation
        // Choose the appropriate status for successful payment
        await ctx.runMutation(internal.orders.internalUpdateOrderStatusFromWebhook, {
          orderId: orderId as Id<"orders">,
          status: "Received", // Or "Completed", "Preparing" etc. based on your flow
          paymentReference: reference, // Pass the Paystack reference
        });
        console.log(`Webhook: Updated status for order ${orderId} to Received.`);

        // Schedule email action
        await ctx.scheduler.runAfter(0, api.actions.sendOrderEmails.sendOrderConfirmationEmails, {
          orderId: orderId as Id<"orders">,
        });
        console.log(`Webhook: Scheduled confirmation emails for order ${orderId}.`);

        // Respond to Paystack confirming receipt
        return new Response(null, { status: 200 });

      } catch (error) {
        console.error(`Webhook Error: Failed processing charge.success for order ${orderId}`, error);
        // Still return 200 to Paystack to avoid retries, but log the error server-side.
        // Optionally return 500 if it's critical that Paystack knows processing failed.
        return new Response("Internal Server Error during webhook processing", { status: 500 }); 
      }
    } 
    // TODO: Handle other relevant Paystack events if needed (e.g., failures, reversals)
    else {
        console.log(`Webhook: Received unhandled event type: ${event.event}`);
    }

    // Default response for unhandled events or successful processing (if not returned earlier)
    return new Response(null, { status: 200 });
  }),
});

export default http; 