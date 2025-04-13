import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define type for customer metadata
type PaystackCustomerMetadata = Record<string, string | number | boolean | null>;

// Define interface for Paystack webhook event
interface PaystackEvent {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    customer: {
      email: string;
      customer_code?: string;  // Make optional
      first_name?: string;     // Make optional
      last_name?: string;      // Make optional
      phone?: string;          // Make optional
      metadata?: PaystackCustomerMetadata;  // Make optional
      risk_action?: string;    // Make optional
      international_format_phone?: string | null;  // Make optional
      id?: number;             // Make optional
    };
    metadata?: {
      cartId?: string;
      userId?: string;
      orderId?: string;
    };
  };
}

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
    
    // Parse the body as JSON
    const event = JSON.parse(body) as PaystackEvent;
    console.log(`Paystack event: ${event.event} for reference: ${event.data.reference}`);
    
    // Get Convex client
    const convex = await getConvexClient();
    
    // Forward the event to Convex for processing
    await convex.action(api.webhook_actions.verifyAndProcessPaystackWebhook, {
      payload: event
    });
    
    console.log(`Webhook: Paystack event ${event.event} forwarded to Convex for processing`);
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