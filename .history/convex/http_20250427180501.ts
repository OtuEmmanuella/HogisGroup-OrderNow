// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api"; // Combined imports
import type { Id } from "./_generated/dataModel";
// No crypto import needed here

const http = httpRouter();

http.route({
  path: "/paystackWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get signature and raw body
    const signature = request.headers.get("x-paystack-signature");
    const body = await request.text();

    if (!signature) {
        console.warn("Webhook Error: Missing x-paystack-signature header");
        return new Response("Missing signature", { status: 400 });
    }

    let event: any;
    try {
      // Call the verification action
      console.log("Webhook: Calling verification action...");
      event = await ctx.runAction(api.actions.paystackActions.verifyPaystackWebhook, {
        signature: signature,
        body: body,
      });
       console.log("Webhook: Verification action succeeded, received event:", event?.event);

    } catch (error) {
      // Action throws error if verification fails or body parsing fails
      console.error("Webhook Error: Verification action failed:", error);
      // Return 400 for invalid signature/payload
      return new Response(`Webhook verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 400 });
    }

    // --- Event Handling (using the verified event object) ---
    try {
        if (event?.event === 'charge.success') {
          const data = event.data;
          const reference = data?.reference;
          const metadata = data?.metadata;
          const orderId = metadata?.orderId; 
    
          console.log(`Webhook: charge.success received for reference: ${reference}, orderId: ${orderId}`);
    
          if (!orderId || !reference) {
             const missing = !orderId ? "orderId in metadata" : "reference";
             console.warn(`Webhook Warning: charge.success event missing ${missing}.`);
             // Still return 200 to Paystack to acknowledge receipt, but log the issue.
             return new Response(`Webhook processed, but missing ${missing}`, { status: 200 }); 
          }
    
          // Update order status via internal mutation
          await ctx.runMutation(internal.orders.internalUpdateOrderStatusFromWebhook, {
            orderId: orderId as Id<"orders">,
            status: "Received", // Or "Completed", "Preparing" etc.
            paymentReference: reference,
          });
          console.log(`Webhook: Updated status for order ${orderId} to Received.`);
    
          // Schedule email action
          await ctx.scheduler.runAfter(0, api.actions.sendOrderEmails.sendOrderConfirmationEmails, {
            orderId: orderId as Id<"orders">,
          });
          console.log(`Webhook: Scheduled confirmation emails for order ${orderId}.`);
    
          // Respond to Paystack confirming successful processing
          return new Response(null, { status: 200 });
    
        } 
        // TODO: Handle other relevant Paystack events if needed (e.g., failures, reversals)
        else {
            console.log(`Webhook: Received and verified unhandled event type: ${event?.event}`);
            // Acknowledge receipt even if not handling the specific event type
            return new Response(null, { status: 200 }); 
        }
    } catch (error) {
         console.error(`Webhook Error: Failed processing verified event ${event?.event} for order ${event?.data?.metadata?.orderId}`, error);
         // Return 500 for internal processing errors *after* verification
         return new Response("Internal Server Error during webhook processing", { status: 500 }); 
    }

  }),
});

export default http; 