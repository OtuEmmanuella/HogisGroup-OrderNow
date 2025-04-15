// Note: No "use node" at the top level for the internal mutation

import { v } from "convex/values";
import { internalMutation, action, ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api"; // Import internal for calling the mutation
import { api } from "./_generated/api"; // Add this import for handleUserCreated function

interface PaystackCustomer {
  email: string;
  customer_code?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
  risk_action?: string;
  international_format_phone?: string | null;
  id?: number;
}

interface VerifyAndProcessPaystackWebhookSuccess {
  verifiedData: {
    reference: string;
    status: string;
    amount: number;
    metadata: {
      cartId?: string;
      userId?: string;
      orderId?: string;
    } | undefined;
    customer: PaystackCustomer;
  };
}

// --- Payload and Response Types ---

// Updated paystackEventPayload validator that accepts all Paystack fields
const paystackEventPayload = v.object({
  event: v.string(),
  data: v.object({
    reference: v.string(),
    status: v.string(),
    amount: v.number(),
    customer: v.any(), // Accept any customer object
    metadata: v.optional(v.any())
  })
});

// Type for the data verified by Paystack API
const verifiedPaystackData = v.object({
  reference: v.string(),
  status: v.string(),
  amount: v.number(),
  customer: v.any(), // Accept any customer object here too
  metadata: v.optional(v.object({
    cartId: v.optional(v.string()),
    userId: v.optional(v.string()),
    orderId: v.optional(v.string()),
  }))
});

interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data?: {
        reference: string;
        status: string;
        amount: number;
        metadata?: {
            cartId?: string;
            userId?: string;
            orderId?: string;
        };
    };
}

// --- Action for Verification ---

/**
 * ACTION: Verifies a Paystack webhook event by calling the Paystack API.
 * Runs in Node.js runtime. If verification succeeds, schedules an internal mutation.
 */
export const verifyAndProcessPaystackWebhook = action({
  args: {
    payload: paystackEventPayload, // Payload received from webhook
  },
  handler: async (ctx: ActionCtx, args): Promise<VerifyAndProcessPaystackWebhookSuccess> => {
    "use node"; // Enable Node.js runtime HERE for this action

    const { event, data: webhookData } = args.payload;
    const { reference, status: webhookStatus, amount: webhookAmount, customer } = webhookData;

    console.log(`Action: Verifying Paystack event ${event} for ref: ${reference}`);

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
        console.error("Action Error: PAYSTACK_SECRET_KEY not set.");
        // Unlike mutations, actions don't automatically retry on env var errors.
        // Consider logging this permanently or throwing a non-retriable error.
        throw new Error("Webhook verification failed: Missing secret key configuration.");
    }

    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

    try {
        const verifyResponse = await fetch(verifyUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${paystackSecretKey}` },
        });

        const verifyJson = (await verifyResponse.json()) as PaystackVerifyResponse;

        if (!verifyResponse.ok || !verifyJson.status || !verifyJson.data) {
            console.error(`Action Error: Paystack verification API error for ref ${reference}:`, verifyJson);
            throw new Error(`Paystack verification failed: ${verifyJson.message || 'API error'}`);
        }

        const verifiedData = verifyJson.data;

        // --- Verification Checks ---
        if (verifiedData.status !== 'success' || webhookStatus !== 'success') {
            console.warn(`Action Warning: Verification status mismatch or not success for ref ${reference}. Verified: ${verifiedData.status}, Webhook: ${webhookStatus}. Ignoring.`);
            // Return a valid object instead of undefined
            return {
                verifiedData: {
                    reference: verifiedData.reference,
                    status: verifiedData.status,
                    amount: verifiedData.amount,
                    metadata: verifiedData.metadata,
                    customer // Pass through the full customer object
                }
            };
        }
        if (verifiedData.amount !== webhookAmount) {
            console.error(`Action Error: Amount mismatch for ref ${reference}. Verified: ${verifiedData.amount}, Webhook: ${webhookAmount}. Potential tampering!`);
            throw new Error(`Webhook verification failed: Amount mismatch for reference ${reference}.`);
        }

        console.log(`Action: Verification successful for ref: ${reference}. Scheduling mutation.`);

        // --- Schedule Internal Mutation with Verified Data ---
        // Pass only the necessary verified data to the mutation
        await ctx.runMutation(internal.webhook_actions.handleVerifiedPaystackEvent, {
             event: event, // Pass the original event type
             verifiedData: { // Pass the validated data object
                 reference: verifiedData.reference,
                 status: verifiedData.status,
                 amount: verifiedData.amount,
                 metadata: verifiedData.metadata, // Pass verified metadata
                 customer // Pass through the full customer object
             }
        });

        return {
           verifiedData: {
               reference: verifiedData.reference,
               status: verifiedData.status,
               amount: verifiedData.amount,
               metadata: verifiedData.metadata,
               customer // Pass through the full customer object
           }
        };

   } catch (error) {
       console.error(`Action Error: Failed during verification or scheduling for ref ${reference}:`, error);
       // Throw error; Convex actions have limited retry capabilities compared to mutations.
       // Consider logging to an external service for monitoring.
       throw new Error(`Webhook action failed for reference ${reference}: ${error instanceof Error ? error.message : "Unknown error"}`);
   }
 },
});


// --- Internal Mutation for DB Updates ---

/**
 * INTERNAL MUTATION: Handles verified Paystack webhook events.
 * Runs in standard Convex runtime (NO Node.js). Trusts the input data.
 */
export const handleVerifiedPaystackEvent = internalMutation({
  args: {
    event: v.string(), // Event type from original payload
    verifiedData: verifiedPaystackData, // Use the validator for verified data structure
  },
  handler: async (ctx, args) => {
    const { event, verifiedData } = args;
    const { reference, status, metadata, amount } = verifiedData;

    // We trust this data because it came from the verified action
    console.log(`Mutation: Processing verified event ${event} for reference: ${reference}`);

    // --- Handle Verified Successful Charge Event ---
    // Status is already confirmed as 'success' by the action
    if (event === "charge.success") {
        if (metadata?.cartId && metadata?.userId) {
            // --- Shared Cart Payment Logic ---
            const cartId = metadata.cartId as Id<"sharedCarts">;
            const userId = metadata.userId;
            console.log(`Mutation: Updating shared cart payment for cart: ${cartId}, user: ${userId}`);

            const member = await ctx.db
              .query("sharedCartMembers")
              .withIndex("by_cart_user", (q) => q.eq("cartId", cartId).eq("userId", userId))
              .filter(q => q.neq(q.field("paymentStatus"), "paid"))
              .first();

            if (!member) {
              console.warn(`Mutation Warning: Shared cart member not found or already paid for cart ${cartId}, user ${userId}. Skipping.`);
              return;
            }

            await ctx.db.patch(member._id, {
              paymentStatus: "paid",
              paystackReference: reference,
              // amountPaid: amount // Store verified amount if needed
            });
            console.log(`Mutation: Marked member ${userId} as paid for cart ${cartId}.`);

            const cart = await ctx.db.get(cartId);
            if (!cart) {
                console.error(`Mutation Error: Cart ${cartId} not found after member payment.`);
                return; // Or throw?
            }

            if (cart.paymentMode === "split") {
              const allMembers = await ctx.db
                .query("sharedCartMembers")
                .withIndex("by_cart", (q) => q.eq("cartId", cartId))
                .collect();
              const allPaid = allMembers.every((m) => m.paymentStatus === "paid");
              if (allPaid) {
                await ctx.db.patch(cartId, { status: "completed" });
                console.log(`Mutation: Shared cart ${cartId} completed (all members paid).`);
              } else {
                 console.log(`Mutation: Shared cart ${cartId} still pending payments.`);
              }
            } else if (cart.paymentMode === "payAll" && cart.initiatorId === userId) {
                await ctx.db.patch(cartId, { status: "completed" });
                console.log(`Mutation: Shared cart ${cartId} completed (initiator paid all).`);
            }

        } else if (metadata?.orderId) {
            // --- Regular Order Payment Logic ---
            const orderId = metadata.orderId as Id<"orders">;
            console.log(`Mutation: Updating regular order payment for order: ${orderId}`);

            const order = await ctx.db.get(orderId);
            if (!order) {
                console.warn(`Mutation Warning: Regular order ${orderId} not found for payment ref ${reference}. Skipping.`);
                return;
            }

            if (order.paymentStatus !== "Paid") {
                 await ctx.db.patch(orderId, {
                    paymentStatus: "Paid",
                    paystackReference: reference,
                 });
                 console.log(`Mutation: Marked regular order ${orderId} as Paid.`);
            } else {
                console.log(`Mutation: Regular order ${orderId} already marked as Paid. Skipping.`);
            }

        } else {
            console.warn(`Mutation Warning: Verified successful charge (ref: ${reference}) missing expected metadata.`);
        }
    } else {
         console.log(`Mutation: Ignoring verified Paystack event type: ${event}`);
    }
  },
});

/**
 * ACTION: Handles new user creation from Clerk webhook
 * Stores user info in the database and sends welcome email
 */
export const handleUserCreated = action({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const { userId, email, name } = args;
    console.log(`Action: Processing new user ${userId} with email ${email}`);

    try {
      // First check if user already exists
      const existingUser = await ctx.runQuery(api.users.getUserByClerkId, { userId });
      
      if (!existingUser) {
        // Create user record if it doesn't exist
        await ctx.runMutation(api.users.syncUser, {
          clerkUserId: userId, 
          name,
          email,
        });
        console.log(`Action: Created new user record for ${userId}`);
      } else {
        console.log(`Action: User ${userId} already exists in database`);
      }

      // Send welcome email using Resend
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          console.error("RESEND_API_KEY is not configured");
          return { success: false, error: "Email configuration missing" };
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Hogis Group <admin@hogisgroup.com>",
            to: email,
            subject: "Welcome to Hogis Group Food Ordering Platform",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to Hogis Group, ${name}!</h2>
                <p>Thank you for signing up. We're excited to have you join us!</p>
                <p>With our platform, you can:</p>
                <ul>
                  <li>Order delicious meals from our menu</li>
                  <li>Create group orders with friends</li>
                  <li>Track your order history</li>
                </ul>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <p>Enjoy your experience!</p>
                <p>The Hogis Group Team</p>
              </div>
            `,
          }),
        });

        const result = await response.json();
        console.log("Welcome email sent:", result);
        return { success: true, emailId: result.id };
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        return { success: true, emailError: "Failed to send welcome email" };
      }
    } catch (error) {
      console.error(`Failed to handle user creation for ${userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

export { verifiedPaystackData, paystackEventPayload };