import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Resend } from "resend";
import crypto from "crypto";
import { paystackWebhook } from "./paystackWebhook";

const http = httpRouter();

// Define the Paystack webhook handler endpoint with /api prefix
http.route({
  path: "/api/paystackWebhook",
  method: "POST",
  handler: paystackWebhook,
});

// Define the Clerk webhook handler endpoint
http.route({
  path: "/api/clerkWebhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get the headers and body
    const headers = request.headers;
    const payload = await request.text(); // Get raw body as string

    try {
      // Convert Headers object to a plain JavaScript object
      const headerObject: { [key: string]: string } = {};
      headers.forEach((value, key) => {
        headerObject[key] = value;
      });

      // Schedule the internal mutation to handle verification and DB updates
      // The svix verification happens inside the mutation now
      await ctx.runMutation(internal.clerk.fulfillUserWebhook, {
        headers: headerObject, // Pass headers as plain object
        payload: payload,
      });

      // Respond to Clerk quickly
      console.log("Clerk webhook received and scheduled for processing.");
      return new Response(null, { status: 200 }); // Acknowledge receipt

    } catch (error) {
      console.error("Failed to schedule Clerk webhook processing:", error);
      // Return an error response to Clerk
      return new Response("Internal server error during scheduling", { status: 500 });
    }
  }),
});

// Initialize Resend with the API key from environment variables
// The API key should be passed when running the server: RESEND_API_KEY=your_key npx convex dev
const resendApiKey = process.env.RESEND_API_KEY;

// Create a function to handle email sending that checks for API key
let resend: any;

// Only initialize Resend if we have an API key
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

http.route({
  path: "/api/sendEmail",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    try {
      // Check if Resend client is initialized (API key is available)
      if (!resend) {
        console.error("RESEND_API_KEY is not defined in environment variables. Email functionality will not work.");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Email service not configured. Please set RESEND_API_KEY environment variable." 
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      const data = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: body.to,
        subject: body.subject,
        text: body.text,
        html: body.html,
      });
      console.log("Email sent via Resend:", data);
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Failed to send email via Resend:", error);
      return new Response(
        JSON.stringify({ success: false, error: (error as Error).message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;