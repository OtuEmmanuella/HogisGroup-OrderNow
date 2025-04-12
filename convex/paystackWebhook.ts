import { httpAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api"; // Import internal for calling the mutation

export const paystackWebhook = httpAction(async (ctx: ActionCtx, request) => {
  "use node";
  // Read the raw body as text first
  const body = await request.text();
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!paystackSecretKey) {
    console.error("PAYSTACK_SECRET_KEY is not set.");
    return new Response("PAYSTACK_SECRET_KEY is not set", { status: 400 });
  }

  const reference = JSON.parse(body)?.data?.reference;
  const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

  try {
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

    // 2. Process the event
    try {
      await ctx.runMutation(internal.webhook_actions.handleVerifiedPaystackEvent, {
        event: JSON.parse(body).event,
        verifiedData: verifyJson.data,
      });

      // 3. Respond to Paystack quickly
      console.log("Paystack webhook received and processed.");
      return new Response(null, { status: 200 }); // Acknowledge receipt
    } catch (error) {
      console.error("Failed to process Paystack webhook:", error);
      // Even if processing fails, try to acknowledge Paystack if possible,
      // but log the internal error.
      return new Response("Internal server error during processing", { status: 500 });
    }
  } catch (error) {
    console.error("Error verifying Paystack webhook:", error);
    return new Response("Error verifying Paystack webhook", { status: 500 });
  }
});