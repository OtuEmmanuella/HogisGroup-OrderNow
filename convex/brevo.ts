"use node"; // Indicate this runs in Node.js environment

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Interface for email parameters (adjust as needed based on Brevo templates)
interface EmailParams {
    orderId: string;
    customerName: string;
    orderStatus?: string;
    totalAmount?: number;
    // Add other relevant details: items summary, branch name, etc.
}

// Action to send a transactional email via Brevo
export const sendTransactionalEmail = action({
    args: {
        toEmail: v.string(),
        toName: v.string(),
        templateId: v.number(), // Brevo template ID
        params: v.object({ // Parameters to pass to the Brevo template
            orderId: v.string(),
            customerName: v.string(),
            orderStatus: v.optional(v.string()),
            totalAmount: v.optional(v.number()),
            // Ensure this matches the expected params in your Brevo template
        }),
    },
    handler: async (ctx, { toEmail, toName, templateId, params }) => {
        const brevoApiKey = process.env.BREVO_API_KEY;

        if (!brevoApiKey) {
            console.error("BREVO_API_KEY environment variable not set.");
            // Optional: throw an error or just log and skip sending
            return { success: false, error: "Brevo API key not configured." };
        }

        const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";

        const payload = {
            to: [{ email: toEmail, name: toName }],
            templateId: templateId,
            params: params, // Pass template parameters directly
            // Optional: Add sender details if not configured in the template/account
            // sender: { email: "noreply@yourdomain.com", name: "Hogis OrderNow" },
        };

        try {
            console.log(`Sending Brevo email template ${templateId} to ${toEmail}...`);
            const response = await fetch(brevoApiUrl, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "api-key": brevoApiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Brevo API error: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`Brevo API request failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Brevo email sent successfully:", result);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error("Failed to send Brevo email:", error);
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    },
});

// --- Helper function within this file or potentially in orders.ts to map status to template --- 
// Example (adjust template IDs as needed)
function getTemplateIdForStatus(status: string): number | null {
    switch (status) {
        case "Pending Confirmation": return 1; // Replace with your actual Brevo template ID
        case "Received": return 2;           // Replace with your actual Brevo template ID
        case "Preparing": return 3;          // Replace with your actual Brevo template ID
        case "Ready for Pickup": return 4; // Replace with your actual Brevo template ID
        case "Out for Delivery": return 5; // Replace with your actual Brevo template ID
        case "Completed": return 6;          // Replace with your actual Brevo template ID
        // Add others like Cancelled if needed
        default: return null;
    }
}

// Optional: Action specifically for order status updates
export const sendOrderStatusUpdateEmail = action({
    args: { orderId: v.id("orders") },
    handler: async (ctx, { orderId }) => {
        // 1. Fetch full order details needed for the email template
        const orderDetails = await ctx.runQuery(api.orders.getOrderDetailsForTracking, { orderId });

        if (!orderDetails) {
            console.error(`Cannot send status update email: Order ${orderId} not found.`);
            return;
        }

        const { order, user } = orderDetails;

        // 2. Determine the correct template ID based on the current status
        const templateId = getTemplateIdForStatus(order.status);
        if (!templateId) {
            console.log(`No email template configured for status: ${order.status}`);
            return; // No template configured for this status
        }

        // 3. Prepare parameters for the template
        const params = {
            orderId: order._id,
            customerName: user.name,
            orderStatus: order.status,
            totalAmount: order.totalAmount,
            // Add other params needed by your specific Brevo template
        };

        // 4. Call the generic send email action
        await ctx.runAction(api.brevo.sendTransactionalEmail, {
            toEmail: user.email,
            toName: user.name,
            templateId: templateId,
            params: params,
        });
    }
}); 