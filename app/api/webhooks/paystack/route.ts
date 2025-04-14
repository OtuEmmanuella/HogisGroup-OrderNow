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

// Redirect all traffic to Convex HTTP endpoint
export async function POST() {
  const convexEndpoint = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexEndpoint) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set");
    return new Response("Server configuration missing", { status: 500 });
  }

  return Response.redirect(`${convexEndpoint}/paystackWebhook`, 307); // 307 preserves POST method
}