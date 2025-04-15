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

// Forward traffic to Convex HTTP endpoint
export async function POST(req: Request) {
  const convexEndpoint = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexEndpoint) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set");
    return new Response("Server configuration missing", { status: 500 });
  }

  // Get the request body as text
  const body = await req.text();
  
  // Ensure the URL is properly constructed with /api prefix
  const webhookUrl = new URL("/api/paystackWebhook", convexEndpoint).toString();
  console.log("Forwarding to Convex webhook endpoint:", webhookUrl);

  // Forward the request with the required duplex option
  return fetch(webhookUrl, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
    duplex: 'half'
  } as RequestInit & { duplex: 'half' });
}