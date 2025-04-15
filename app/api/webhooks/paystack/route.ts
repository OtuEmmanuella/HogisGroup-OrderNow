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
  return fetch(webhookUrl, {
    method: "POST",
    headers: req.headers,
    body: req.body
  });
}