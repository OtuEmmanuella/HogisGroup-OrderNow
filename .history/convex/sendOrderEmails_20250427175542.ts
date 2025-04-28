import { Resend } from 'resend';
import { action } from './_generated/server';
import { api } from './_generated/api'; // Removed internal import as it wasn't used
import { v } from 'convex/values';
import { Id, Doc } from './_generated/dataModel'; // Import Doc
import { query } from "./_generated/server"; // Import query for helper

// Initialize Resend with API key from environment variables
// Ensure RESEND_API_KEY is set in your Convex project dashboard
const resendApiKey = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendApiKey) {
    resend = new Resend(resendApiKey);
} else {
    console.warn('RESEND_API_KEY environment variable not set. Email sending will be disabled.');
}

// Helper function to format currency (assuming amount is in Kobo)
const formatCurrency = (amountKobo: number) => {
    if (typeof amountKobo !== 'number' || isNaN(amountKobo)) return "N/A";
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amountKobo / 100);
};

// Type definition for Branch data expected within the action
// Ensure your getOrderWithDetails query returns branch with these fields
interface BranchInfo {
    _id: Id<"branches">;
    name: string;
    email?: string | null; // Make email optional as per schema
    // Add other fields if needed by email templates
}

// Type definition for User data expected within the action
// Ensure your getUserProfileById query returns user with these fields
interface UserInfo {
    email?: string | null;
    name?: string | null;
    primaryPhone?: string | null; // Assuming phone might be on user doc
    // Add other fields if needed
}

// Type definition for the Order details expected from the query
// Ensure getOrderWithDetails returns this structure
interface OrderDetails {
    _id: Id<"orders">;
    branchId: Id<"branches">;
    userId: string; // Assuming string from Clerk/auth
    customerName?: string | null;
    items: Array<{ quantity: number; name?: string | null; unitPrice: number; menuItemId: Id<"menuItems"> }>;
    totalAmount: number;
    orderType?: "Delivery" | "Dine-In" | "Take-out" | null;
    status?: string | null;
    deliveryAddress?: { street: string; customerPhone?: string | null; recipientName?: string | null; recipientPhone?: string | null } | null;
    pickupTime?: number | null;
    branch?: BranchInfo | null;
}

export const sendOrderConfirmationEmails = action({
    args: { orderId: v.id('orders') },
    handler: async (ctx, { orderId }) => {
        if (!resend) {
            console.error('Resend client not initialized. Check RESEND_API_KEY.');
            return { success: false, error: 'Resend client not initialized.' };
        }
        const senderEmail = process.env.EMAIL_USER;
        if (!senderEmail) {
            console.error('EMAIL_USER environment variable not set for sender.');
            return { success: false, error: 'Sender email (EMAIL_USER) not configured.' };
        }

        console.log(`[ACTION sendOrderConfirmationEmails] Sending emails for order: ${orderId}`);

        try {
            // 1. Fetch Order Details
            const orderDetails = await ctx.runQuery(api.orders.getOrderWithDetails, { orderId }) as OrderDetails | null;

            if (!orderDetails) throw new Error(`Order ${orderId} not found.`);
            if (!orderDetails.branch) throw new Error(`Branch details not found for order ${orderId}.`);
            if (!orderDetails.userId) throw new Error(`User ID not found for order ${orderId}.`);

            // 2. Fetch User Email
            const user = await ctx.runQuery(api.users.getUserProfileById, { userId: orderDetails.userId }) as UserInfo | null;
            if (!user || !user.email) throw new Error(`User email not found for user ID ${orderDetails.userId}.`);
            
            const userEmail = user.email;
            const userName = orderDetails.customerName ?? user.name ?? 'Valued Customer'; // Prefer order name, fallback to user name

            // 3. Get Branch Email
            const branchEmail = orderDetails.branch.email;
            if (!branchEmail) {
                console.warn(`Branch email not configured for branch ${orderDetails.branch._id} (${orderDetails.branch.name}). Cannot send branch notification.`);
                // Continue to send user email even if branch email is missing
            }

            // 4. Construct Email Content
            const orderItemsHtml = orderDetails.items.map(item =>
                `<li>${item.quantity} x ${item.name ?? 'Item'} (${formatCurrency(item.unitPrice)})</li>`
            ).join('');
            
            const orderIdShort = orderDetails._id.slice(-6).toUpperCase();

            const userSubject = `Your Hogis Order Confirmation (#${orderIdShort})`;
            const userHtml = `
                <h1>Thank you for your order, ${userName}!</h1>
                <p>Your order (<b>#${orderIdShort}</b>) from <b>${orderDetails.branch.name}</b> has been received.</p>
                <h2>Order Summary:</h2>
                <ul>${orderItemsHtml}</ul>
                <p><strong>Total Amount:</strong> ${formatCurrency(orderDetails.totalAmount)}</p>
                <p><strong>Order Type:</strong> ${orderDetails.orderType ?? 'N/A'}</p>
                ${orderDetails.orderType === 'Delivery' && orderDetails.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${orderDetails.deliveryAddress.street}</p>` : ''}
                ${orderDetails.orderType === 'Take-out' && orderDetails.pickupTime ? `<p><strong>Pickup Time:</strong> ${new Date(orderDetails.pickupTime).toLocaleTimeString('en-NG')}</p>` : ''}
                <p>Status: ${orderDetails.status ?? 'N/A'}</p>
                <hr>
                <p>We'll notify you when your order is ready!</p>
                <p>Thanks for choosing Hogis!</p>
            `;

            const branchSubject = `New Order Received (#${orderIdShort}) - ${orderDetails.orderType ?? 'N/A'}`;
            const branchHtml = `
                <h1>New Order Received! (#${orderIdShort})</h1>
                <p><strong>Branch:</strong> ${orderDetails.branch.name}</p>
                <p><strong>Customer Name:</strong> ${userName}</p>
                <p><strong>Customer Contact (Phone):</strong> ${user.primaryPhone ?? 'N/A'} </p> 
                <p><strong>Customer Contact (Email):</strong> ${userEmail} </p> 
                <p><strong>Order Type:</strong> ${orderDetails.orderType ?? 'N/A'}</p>
                <h2>Order Items:</h2>
                <ul>${orderItemsHtml}</ul>
                <p><strong>Total Amount:</strong> ${formatCurrency(orderDetails.totalAmount)}</p>
                ${orderDetails.orderType === 'Delivery' && orderDetails.deliveryAddress ? `
                    <h2>Delivery Details:</h2>
                    <p><b>Address:</b> ${orderDetails.deliveryAddress.street}</p>
                    <p><b>Phone:</b> ${orderDetails.deliveryAddress.customerPhone ?? 'N/A'}</p>
                     ${orderDetails.deliveryAddress.recipientName ? `<p>Recipient Name: ${orderDetails.deliveryAddress.recipientName}</p>` : ''}
                     ${orderDetails.deliveryAddress.recipientPhone ? `<p>Recipient Phone: ${orderDetails.deliveryAddress.recipientPhone}</p>` : ''}
                ` : ''}
                ${orderDetails.orderType === 'Take-out' && orderDetails.pickupTime ? `<p><strong>Requested Pickup Time:</strong> ${new Date(orderDetails.pickupTime).toLocaleString('en-NG')}</p>` : ''}
                <p><b>Current Status:</b> ${orderDetails.status ?? 'N/A'}</p>
                <hr>
                <p>Please prepare the order for the customer.</p>
                <p><i>Manage this order in the admin panel.</i></p>
            `;

            // 5. Send Emails using Resend
            const promises = [];
            const fromAddress = `Hogis <${senderEmail}>`; // Use the configured sender email

            // Send to User
            promises.push(resend.emails.send({
                from: fromAddress,
                to: [userEmail],
                subject: userSubject,
                html: userHtml,
            }));
            console.log(`[ACTION sendOrderConfirmationEmails] Attempting to send user email to ${userEmail}`);

            // Send to Branch (if email is configured)
            if (branchEmail) {
                promises.push(resend.emails.send({
                    from: fromAddress,
                    to: [branchEmail],
                    subject: branchSubject,
                    html: branchHtml,
                }));
                console.log(`[ACTION sendOrderConfirmationEmails] Attempting to send branch email to ${branchEmail}`);
            }

            const results = await Promise.allSettled(promises);
            let userEmailSuccess = false;
            let branchEmailSuccess = !branchEmail; // True if no branch email needed

            results.forEach((result, index) => {
                const recipient = index === 0 ? `user (${userEmail})` : `branch (${branchEmail})`;
                if (result.status === 'rejected') {
                    console.error(`[ACTION sendOrderConfirmationEmails] Failed to send email to ${recipient}:`, result.reason);
                } else {
                    console.log(`[ACTION sendOrderConfirmationEmails] Email to ${recipient} sent successfully:`, result.value);
                    if (index === 0) userEmailSuccess = true;
                    if (index === 1) branchEmailSuccess = true;
                }
            });

            return { success: userEmailSuccess && branchEmailSuccess, userEmailSent: userEmailSuccess, branchEmailSent: branchEmailSuccess };

        } catch (error) {
            console.error('[ACTION sendOrderConfirmationEmails] Error processing email sending:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error during email sending.' };
        }
    },
});

// Helper query to get user profile (assuming users table schema)
export const getUserProfileById = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }): Promise<UserInfo | null> => {
        const userDoc = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .first();
            
        if (!userDoc) return null;
        
        // Map to UserInfo type
        return {
            email: userDoc.email,
            name: userDoc.name,
            // Example: accessing nested address phone, adjust if your schema differs
            primaryPhone: userDoc.address?.customerPhone 
        };
    },
}); 