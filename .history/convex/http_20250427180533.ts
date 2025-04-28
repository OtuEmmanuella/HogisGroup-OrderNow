// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api"; // Combined imports
import type { Id } from "./_generated/dataModel";
// No need for external crypto library import, use global 'crypto' for Web Crypto

// Helper function to convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

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

    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
        console.warn("Webhook Error: Missing x-paystack-signature header");
        return new Response("Missing signature", { status: 400 });
    }

    const body = await request.text(); // Get raw body as text

    // --- Start Web Crypto HMAC SHA512 Verification ---
    try {
        console.log("Webhook: Verifying signature using Web Crypto...");
        const enc = new TextEncoder(); // Encoder for converting string to Uint8Array
        const key = await crypto.subtle.importKey(
            "raw",                // Format of the key
            enc.encode(secret),   // Key material as Uint8Array
            { name: "HMAC", hash: "SHA-512" }, // Algorithm details
            false,                // Not extractable
            ["sign"]              // Key usage
        );

        const signatureBuffer = await crypto.subtle.sign(
            "HMAC",               // Algorithm
            key,                  // The imported key
            enc.encode(body)      // Data to sign as Uint8Array
        );

        const calculatedSignatureHex = bufferToHex(signatureBuffer);

        if (calculatedSignatureHex !== signature) {
            console.warn(`Webhook Error: Invalid signature. Expected ${calculatedSignatureHex}, got ${signature}`);
            return new Response("Invalid signature", { status: 400 });
        }
        console.log("Webhook: Signature verified successfully using Web Crypto.");

    } catch (error) {
        console.error("Webhook Error: Web Crypto signature verification failed", error);
        return new Response("Signature verification failed", { status: 400 });
    }
    // --- End Web Crypto Verification ---

    // Parse the verified body
    let event: any;
    try {
        event = JSON.parse(body);
        console.log("Webhook received event:", event.event);
    } catch (error) {
        console.error("Webhook Error: Failed to parse verified request body", error);
        return new Response("Invalid payload", { status: 400 });
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
             return new Response(`Webhook processed, but missing ${missing}`, { status: 200 });
          }

          // Update order status via internal mutation
          await ctx.runMutation(internal.orders.internalUpdateOrderStatusFromWebhook, {
            orderId: orderId as Id<"orders">,
            status: "Received", // Or "Completed", "Preparing" etc.
            paymentReference: reference,
          });
          console.log(`Webhook: Updated status for order ${orderId} to Received.`);

          // Schedule email action - KEEPING THE ORIGINAL REFERENCE PATH
          // This error should resolve once the build succeeds without the crypto issue
          await ctx.scheduler.runAfter(0, api.actions.sendOrderEmails.sendOrderConfirmationEmails, {
            orderId: orderId as Id<"orders">,
          });
          console.log(`Webhook: Scheduled confirmation emails for order ${orderId}.`);

          // Respond to Paystack confirming successful processing
          return new Response(null, { status: 200 });

        }
        else {
            console.log(`Webhook: Received and verified unhandled event type: ${event?.event}`);
            return new Response(null, { status: 200 });
        }
    } catch (error) {
         console.error(`Webhook Error: Failed processing verified event ${event?.event} for order ${event?.data?.metadata?.orderId}`, error);
         return new Response("Internal Server Error during webhook processing", { status: 500 });
    }
  }),
});

export default http; 