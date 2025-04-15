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
export async function POST(req: Request) {
  const convexEndpoint = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexEndpoint) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set");
    return new Response("Server configuration missing", { status: 500 });
  }

  // Ensure the URL is properly constructed
  const webhookUrl = new URL("/paystackWebhook", convexEndpoint).toString();
  console.log("Redirecting to Convex webhook endpoint:", webhookUrl);

  // Forward the original request
  // Create new headers, only forwarding Content-Type
  const headers = new Headers();
  if (req.headers.get('content-type')) {
    headers.set('content-type', req.headers.get('content-type')!);
  }
  // Add any other headers you specifically need to forward, e.g., Paystack signature if used

  return fetch(webhookUrl, {
    method: "POST",
    headers: headers, // Use the filtered headers
    body: req.body,
    // @ts-expect-error - duplex is required when streaming bodies
    duplex: 'half'
  });
}