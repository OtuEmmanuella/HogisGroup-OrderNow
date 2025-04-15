import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

// Handle Paystack webhook directly
export async function POST(req: Request) {
  try {
    // Get the request body
    const body = await req.text();
    console.log("Paystack webhook received");
    
    // Get Convex client
    const convex = await getConvexClient();
    
    // Forward to Convex webhook action for processing
    await convex.action(api.webhook_actions.verifyAndProcessPaystackWebhook, {
      payload: JSON.parse(body)
    });
    
    console.log("Webhook processed successfully");
    return new Response("Webhook Processed Successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}