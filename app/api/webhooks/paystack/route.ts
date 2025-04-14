import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  console.log("Paystack webhook received");

  // Get the webhook secret from environment variables
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set for webhook verification.");
    return new Response("Webhook Error: Server configuration missing", { status: 500 });
  }

  try {
    // Get the request body
    const body = await req.text();
    console.log("Raw webhook body received");
    
    // Parse the body as JSON and forward it directly
    const rawEvent = JSON.parse(body);
    
    // Get Convex client
    const convex = await getConvexClient();
    
    // Forward the raw event to Convex for processing
    await convex.action(api.webhook_actions.verifyAndProcessPaystackWebhook, {
      payload: rawEvent
    });
    
    console.log("Webhook forwarded to Convex for processing");
    return new Response("Webhook Processed Successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}