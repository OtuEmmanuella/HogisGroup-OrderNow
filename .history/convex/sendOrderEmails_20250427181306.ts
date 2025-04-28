// This file is being moved to convex/actions/sendOrderEmails.ts
// Contents remain the same for now (simplified version)

// import { Resend } from 'resend'; // Commented out
import { action } from '../_generated/server'; // Adjusted path for server
import { api } from '../_generated/api'; // Adjusted path for api
import { v } from 'convex/values';
import { Id, Doc } from '../_generated/dataModel'; // Adjusted path for dataModel
import { query } from "../_generated/server"; // Adjusted path for server

// --- All original code commented out ---
/*
const resendApiKey = process.env.RESEND_API_KEY;
let resend: Resend | null = null;
if (resendApiKey) {
    resend = new Resend(resendApiKey);
} else {
    console.warn('RESEND_API_KEY environment variable not set. Email sending will be disabled.');
}

const formatCurrency = (amountKobo: number) => {
    if (typeof amountKobo !== 'number' || isNaN(amountKobo)) return "N/A";
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amountKobo / 100);
};

interface BranchInfo {
    _id: Id<"branches">;
    name: string;
    email?: string | null;
}

interface UserInfo {
    email?: string | null;
    name?: string | null;
    primaryPhone?: string | null;
}

interface OrderDetails {
    _id: Id<"orders">;
    branchId: Id<"branches">;
    userId: string; 
    customerName?: string | null;
    items: Array<{ quantity: number; name?: string | null; unitPrice: number; menuItemId: Id<"menuItems"> }>;
    totalAmount: number;
    orderType?: "Delivery" | "Dine-In" | "Take-out" | null;
    status?: string | null;
    deliveryAddress?: { street: string; customerPhone?: string | null; recipientName?: string | null; recipientPhone?: string | null } | null;
    pickupTime?: number | null;
    branch?: BranchInfo | null;
}

export const getUserByIdQueryHelper = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }): Promise<UserInfo | null> => {
        const userDoc = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId", userId))
            .first();
            
        if (!userDoc) return null;
        
        return {
            email: userDoc.email,
            name: userDoc.name,
            primaryPhone: userDoc.address?.customerPhone 
        };
    },
});
*/

// --- Simplified Action --- (Now in actions/sendOrderEmails.ts)
export const sendOrderConfirmationEmails = action({
    args: { orderId: v.id('orders') },
    handler: async (ctx, { orderId }) => {
        console.log(`[ACTION actions/sendOrderEmails] Triggered (simplified) for order: ${orderId}`);
        // Do nothing for now
        await Promise.resolve(); // Ensure it's async
        return { success: true }; // Simulate success
    },
}); 