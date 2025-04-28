"use node"; // Action can use Node.js runtime

import crypto from "crypto";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const verifyPaystackWebhook = action({
    args: {
        signature: v.string(),
        body: v.string(), // Pass raw request body as string
    },
    handler: async (ctx, { signature, body }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            throw new Error("PAYSTACK_SECRET_KEY environment variable not set.");
        }

        console.log("[ACTION verifyPaystackWebhook] Verifying signature...");

        // Perform signature verification
        try {
            const hash = crypto
                .createHmac('sha512', secret)
                .update(body) // Use the raw string body
                .digest('hex');

            if (hash !== signature) {
                 console.warn("[ACTION verifyPaystackWebhook] Invalid signature.");
                throw new Error("Invalid webhook signature");
            }
        } catch (error) {
            console.error("[ACTION verifyPaystackWebhook] Signature verification failed", error);
            throw new Error(`Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        console.log("[ACTION verifyPaystackWebhook] Signature verified successfully.");

        // Parse the verified body and return the event payload
        try {
            const event = JSON.parse(body);
             console.log(`[ACTION verifyPaystackWebhook] Parsed event: ${event.event}`);
            return event; // Return the parsed event object
        } catch (error) {
            console.error("[ACTION verifyPaystackWebhook] Failed to parse verified request body", error);
            throw new Error("Invalid payload format after verification.");
        }
    },
}); 