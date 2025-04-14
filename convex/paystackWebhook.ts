import { httpAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api"; 

export const paystackWebhook = httpAction(async (ctx: ActionCtx, request) => {
  "use node";
  // Read the raw body as text first
  const body = await request.text();
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not set.");
    return new Response("PAYSTACK_SECRET_KEY is not set", { status: 400 });
  }
  
  try {
    // Parse and validate the incoming webhook payload
    const payload = JSON.parse(body);
    
    // Simple validation - only check for required email field
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
    
    // Process the event
    try {
      await ctx.runMutation(internal.webhook_actions.handleVerifiedPaystackEvent, {
        event: payload.event,
        verifiedData: verifyJson.data,
      });
      
      // Respond to Paystack quickly
      console.log("Paystack webhook received and processed.");
      return new Response(null, { status: 200 }); // Acknowledge receipt
    } catch (error) {
      console.error("Failed to process Paystack webhook:", error);
      return new Response("Internal server error during processing", { status: 500 });
    }
  } catch (error) {
    console.error("Error verifying Paystack webhook:", error);
    return new Response("Error verifying Paystack webhook", { status: 500 });
  }
});