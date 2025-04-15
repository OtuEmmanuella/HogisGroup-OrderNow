import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PaystackCustomerMetadata {
  userId?: string;
  cartId?: string;
  orderId?: string;
}

interface PaystackCustomer {
  email: string;
  customer_code?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: PaystackCustomerMetadata;
  risk_action?: string;
  international_format_phone?: string | null;
  id?: number;
}

interface PaystackWebhookData {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    customer: PaystackCustomer;
    metadata?: PaystackCustomerMetadata;
  };
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

// Handle Paystack webhook directly
export async function POST(req: Request) {
  try {
    // Get the request body
    const body = await req.text();
    const payload = JSON.parse(body) as PaystackWebhookData;
    console.log("Paystack webhook received:", { event: payload.event, reference: payload.data.reference });
    
    // Get Convex client
    const convex = await getConvexClient();
    
    // Forward to Convex webhook action for processing
    await convex.action(api.webhook_actions.verifyAndProcessPaystackWebhook, {
      payload: {
        event: payload.event,
        data: {
          reference: payload.data.reference,
          status: payload.data.status,
          amount: payload.data.amount,
          customer: payload.data.customer,
          metadata: payload.data.metadata
        }
      }
    });
    
    console.log("Webhook processed successfully");
    return new Response("Webhook Processed Successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}