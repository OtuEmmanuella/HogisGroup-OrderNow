import { headers } from "next/headers";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define the Clerk webhook event type
interface ClerkEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    // Add other properties as needed based on Clerk's webhook data structure
  };
}

export async function POST(req: Request) {
  console.log("Clerk webhook received");

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set for webhook verification.");
    return new Response("Webhook Error: Server configuration missing", { status: 500 });
  }

  // Add this code to call the webhook_actions.handleUserCreated function
  
  // Get the request body
  const body = await req.text();
  
  // Verify the webhook signature (keep your existing verification code)
  const headersList = await headers();
  const signature = headersList.get("svix-signature") as string;
  const svixId = headersList.get("svix-id") as string;
  const svixTimestamp = headersList.get("svix-timestamp") as string;

  console.log("Clerk Signature:", signature ? "Present" : "Missing");

  if (!signature || !svixId || !svixTimestamp) {
    console.warn("Webhook Error: Missing Svix headers");
    return new Response("Webhook Error: Missing headers", { status: 400 });
  }

  // Verify webhook signature
  try {
    const signatureData = `${svixId}.${svixTimestamp}.${body}`;
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(signatureData).digest("hex");

    if (digest !== signature) {
      console.warn("Webhook Error: Invalid signature");
      return new Response("Webhook Error: Invalid signature", { status: 400 });
    }
    console.log("Webhook signature verified successfully.");
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown verification error'}`, {
      status: 400,
    });
  }

  // Parse the event
  let event: ClerkEvent;
  try {
    event = JSON.parse(body);
  } catch (err) {
    console.error("Webhook Error: Failed to parse JSON body:", err);
    return new Response("Webhook Error: Invalid JSON payload", { status: 400 });
  }
  
  // Handle user events
  if (event.type === "user.created" || event.type === "user.signed_in") {
    console.log(`Processing ${event.type} event`);
    const userData = event.data;
    
    // Extract user information
    const userId = userData.id;
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name || "";
    const lastName = userData.last_name || "";
    const name = `${firstName} ${lastName}`.trim();
    
    if (!email) {
      console.warn(`User created without email: ${userId}`);
      return new Response("Webhook Warning: User has no email", { status: 200 });
    }
    
    try {
      // Get Convex client
      const convex = await getConvexClient();
      
      // Call Convex action to handle welcome email
      const actionResult = await convex.action(api.webhook_actions.handleUserCreated, {
        userId,
        email,
        name
      });
      
      console.log(`Webhook: Email sent for user ${userId}. Result:`, actionResult);
      return new Response("Webhook Processed Successfully", { status: 200 });
    } catch (error) {
      console.error(`Webhook Error: Failed to call Convex action for user ${userId}:`, error);
      return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Failed to communicate with backend'}`, { status: 500 });
    }
  }
  
  // Acknowledge receipt for unhandled events
  return new Response(null, { status: 200 });
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, svix-id, svix-signature, svix-timestamp',
    }
  });
}