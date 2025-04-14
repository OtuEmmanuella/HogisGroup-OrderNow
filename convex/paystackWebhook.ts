import { httpAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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

export const paystackWebhook = httpAction(async (ctx: ActionCtx, request) => {
  "use node";
  const body = await request.text();
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not set.");
    return new Response("PAYSTACK_SECRET_KEY is not set", { status: 400 });
  }
  
  try {
    // Parse and validate the incoming webhook payload
    const payload = JSON.parse(body);
    
    // Basic validation of required fields
    if (!payload?.data?.customer?.email) {
      console.error("Missing required email in customer data");
      return new Response("Invalid payload: missing customer email", { status: 400 });
    }
    
    const reference = payload.data.reference;
    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    
    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });
    
    const verifyJson = await verifyResponse.json();
    
    if (!verifyResponse.ok || !verifyJson.status) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid Paystack signature", { status: 401 });
    }
    
    // Process the verified event with webhook_actions handler
    try {
      await ctx.runMutation(internal.webhook_actions.handleVerifiedPaystackEvent, {
        event: payload.event,
        verifiedData: {
          reference: payload.data.reference,
          status: payload.data.status,
          amount: payload.data.amount,
          metadata: payload.data.metadata,
          customer: payload.data.customer
        }
      });
      
      console.log("Paystack webhook received and processed.");
      return new Response(null, { status: 200 }); // Acknowledge receipt
    } catch (error) {
      console.error("Failed to process Paystack webhook:", error);
      return new Response("Internal server error during processing", { status: 500 });
    }
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
});