"use node";

import { action } from "./_generated/server";
import { internalMutation } from "./_generated/server"; // Use internalMutation for security
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Interface for Paystack initialization response (simplified)
interface PaystackInitResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

// Action to initialize a Paystack transaction
export const initializeTransaction = action({
    args: {
        orderId: v.id("orders"),
        email: v.string(),
        amountKobo: v.number(), // Amount MUST be in kobo (or cents)
    },
    handler: async (ctx, { orderId, email, amountKobo }) => {
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!paystackSecretKey) {
            console.error("PAYSTACK_SECRET_KEY environment variable not set.");
            throw new Error("Payment provider configuration error."); 
        }

        // Validate amount (must be positive integer)
        if (amountKobo <= 0 || !Number.isInteger(amountKobo)) {
            console.error("Invalid amount for Paystack transaction:", amountKobo);
             throw new Error("Invalid transaction amount.");
        }

        const paystackApiUrl = "https://api.paystack.co/transaction/initialize";
        // Generate a unique reference for this attempt if needed, or use orderId?
        // Using orderId as reference might be simple but check Paystack docs
        const reference = `HOGIS_${orderId}_${Date.now()}`; // Example: Add timestamp for uniqueness

        const payload = {
            email: email,
            amount: amountKobo,
            reference: reference,
            // Optional: Add callback_url if you want Paystack to redirect user back
            // callback_url: `${process.env.CONVEX_SITE_URL}/payment/verify?orderId=${orderId}`,
            metadata: { 
                orderId: orderId,
                // Add any other relevant info
            }
        };

        try {
            console.log(`Initializing Paystack transaction for order ${orderId}...`);
            const response = await fetch(paystackApiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${paystackSecretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok || !responseData.status) {
                console.error("Paystack API error:", responseData);
                throw new Error(responseData.message || "Failed to initialize Paystack transaction.");
            }

            const typedResponse = responseData as PaystackInitResponse;

            // Call the PUBLIC mutation in orders.ts
            await ctx.runMutation(api.orders.addPaystackReference, {
                orderId: orderId,
                paystackReference: typedResponse.data.reference, // Use reference returned by Paystack
            });

            console.log(`Paystack transaction initialized for ${orderId}, reference: ${typedResponse.data.reference}`);
            
            // Return the authorization URL for redirection
            return typedResponse.data.authorization_url;

        } catch (error) {
            console.error("Failed to initialize Paystack transaction:", error);
            // Rethrow or return an error indicator
            throw new Error(`Payment initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
}); 