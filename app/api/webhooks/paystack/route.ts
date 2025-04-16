import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

// Define interfaces for Paystack webhook payloads.
interface PaystackCustomer {
  email: string;
  customer_code?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
  risk_action?: string;
}

interface PaystackWebhookData {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    customer: PaystackCustomer;
    metadata?: {
      cartId?: string;
      userId?: string;
      orderId?: string;
    };
  };
}

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

// Allow CORS preflight.
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  // Read environment variables.
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDeployKey = process.env.CONVEX_DEPLOYMENT_KEY;

  if (!paystackSecretKey || !convexUrl || !convexDeployKey) {
    console.error("Missing required environment variables");
    return NextResponse.json(
      { error: "Server configuration missing" },
      { status: 500 }
    );
  }

  // Read and parse the raw request body.
  const rawBody = await req.text();
  let payload: PaystackWebhookData;
  try {
    payload = JSON.parse(rawBody);
    console.log("Received Paystack payload:", payload);
    if (!payload?.event || !payload?.data?.reference) {
      console.error("Invalid payload structure received:", payload);
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Verify the transaction with Paystack.
  const reference = payload.data.reference;
  const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;

  try {
    console.log(`Verifying Paystack transaction: ${reference}`);
    const verifyResponse = await fetch(verifyUrl, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const verifyJson = (await verifyResponse.json()) as PaystackVerifyResponse;
    console.log("Paystack verification response:", verifyJson);

    if (!verifyResponse.ok || !verifyJson.status || !verifyJson.data) {
      console.error("Paystack verification failed:", verifyJson.message || 'API error');
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 }
      );
    }

    const verifiedData = verifyJson.data;

    // Ensure the verified amount matches the payload to prevent tampering.
    if (verifiedData.amount !== payload.data.amount) {
      console.error("Amount mismatch - potential tampering!");
      return NextResponse.json(
        { error: "Amount verification failed" },
        { status: 400 }
      );
    }

    // Now call your Convex action with the verified data.
    try {
      console.log("Calling Convex with verified data");
      const convex = new ConvexHttpClient(convexUrl);
      // Use setAuth with your deployment key. In your version, setAdminAuth is not available.
      // Ensure that your deployment key is in the format expected by Convex (for example, "prod:alias|<token>").
      convex.setAuth(convexDeployKey);

      await convex.action(api.webhook_actions.processVerifiedPaystackWebhook, {
        event: payload.event,
        verifiedData: {
          reference: verifiedData.reference,
          status: verifiedData.status,
          amount: verifiedData.amount,
          metadata: verifiedData.metadata,
          customer: payload.data.customer,
        },
      });

      console.log("Successfully processed webhook through Convex");
      return NextResponse.json(
        { received: true, processed: true },
        { status: 200 }
      );
    } catch (convexError) {
      console.error("Error calling Convex:", convexError);
      return NextResponse.json(
        { error: "Internal processing error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error during Paystack verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
