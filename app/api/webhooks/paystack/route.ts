import { headers } from "next/headers";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";
import { PaystackMetadata } from "@/app/actions/initializePaystackTransaction";

// Define expected Paystack event structure
interface PaystackEvent<T = Record<string, unknown>> { // Default data to Record
  event: string;
  data: T;
}

interface PaystackChargeData {
  id: number;
  domain: string;
  status: string; // e.g., "success"
  reference: string;
  amount: number; // Amount in kobo
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: string; // The stringified metadata we sent
  log: Record<string, unknown> | null; // Use Record
  fees: number | null;
  fees_split: Record<string, unknown> | null; // Use Record
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: Record<string, unknown> | null; // Use Record
    risk_action: string;
    international_format_phone: string | null;
  };
  plan: Record<string, unknown> | null; // Use Record
  subaccount: {
      subaccount_code: string;
      // Define other subaccount fields if needed, or use Record
      [key: string]: unknown; // Allow other unknown fields
  };
  // Allow other unknown top-level fields
  [key: string]: unknown;
}

export async function POST(req: Request) {
  console.log("Paystack webhook received");

  const secret = process.env.PAYSTACK_SECRET_KEY!; // Use Secret Key for verification
   if (!secret) {
       console.error("PAYSTACK_SECRET_KEY is not set for webhook verification.");
       return new Response("Webhook Error: Server configuration missing", { status: 500 });
   }

  const body = await req.text(); // Read body as text for hash verification
  const headersList = await headers();
  const signature = headersList.get("x-paystack-signature") as string;

  console.log("Paystack Signature:", signature ? "Present" : "Missing");

  if (!signature) {
    console.warn("Webhook Error: Missing x-paystack-signature header");
    return new Response("Webhook Error: Missing signature", { status: 400 });
  }

  // Verify webhook signature
  try {
    const hash = crypto
      .createHmac("sha512", secret)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.warn("Webhook Error: Invalid signature");
      return new Response("Webhook Error: Invalid signature", { status: 400 });
    }
    console.log("Webhook signature verified successfully.");
  } catch (err: unknown) { // Changed from any
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown verification error'}`, {
      status: 400,
    });
  }

  let event: PaystackEvent<PaystackChargeData>;
   try {
     event = JSON.parse(body);
   } catch (err: unknown) { // Changed from any
     console.error("Webhook Error: Failed to parse JSON body:", err);
     return new Response("Webhook Error: Invalid JSON payload", { status: 400 });
   }

  // Initialize Convex Client
  const convex = getConvexClient();

  // Handle the charge success event
  if (event.event === "charge.success") {
    console.log("Processing charge.success event");
    const chargeData = event.data;

    // Double-check status
    if (chargeData.status !== "success") {
        console.warn(`Received charge.success event but status is ${chargeData.status}. Skipping.`);
        return new Response("Webhook Warning: Event status mismatch", { status: 200 });
    }

    // Extract Paystack Reference
    const paystackReference = chargeData.reference;
    if (!paystackReference) {
        console.error("Webhook Error: Missing reference in charge.success event data.");
        return new Response("Webhook Error: Missing payment reference", { status: 400 });
    }
    console.log(`Webhook processing for reference: ${paystackReference}`);

    // --- Call Convex Action to handle payment --- 
    try {
      // Call the public action, passing the reference
      const actionResult = await convex.action(api.webhook_actions.handleSuccessfulPayment, {
          paystackReference: paystackReference 
      });

      // Check the result from the action
      if (actionResult.success) {
          console.log(`Webhook: Convex action succeeded for reference ${paystackReference}. Message: ${actionResult.message}`);
          // Action succeeded (order updated or already processed). Return 200 OK.
          return new Response("Webhook Processed Successfully", { status: 200 });
      } else {
          // Action reported a failure (e.g., order not found, internal error)
          console.warn(`Webhook: Convex action failed for reference ${paystackReference}. Message: ${actionResult.message}`);
          // If order not found, it's not a server error, return 200.
          // If it was an internal error within the action, return 500.
          if (actionResult.message === "Order not found for reference.") {
              return new Response("Webhook OK: Order not found", { status: 200 });
          } else {
              return new Response(`Webhook Processing Error: ${actionResult.message}`, { status: 500 });
          }
      }

    } catch (error: unknown) {
      // Catch errors during the convex.action call itself
      console.error(`Webhook Error: Failed to call Convex action for reference ${paystackReference}:`, error);
      return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Failed to communicate with backend'}`, { status: 500 });
    }

  } else {
      console.log(`Received unhandled Paystack event type: ${event.event}`);
  }

  // Acknowledge receipt for unhandled events or if processing reaches here unexpectedly
  return new Response(null, { status: 200 });
}
