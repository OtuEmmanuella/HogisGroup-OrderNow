import { v } from "convex/values";
import { internalMutation, action } from "./_generated/server";
import { verifiedPaystackData } from "./webhook_actions";
import { Id, Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Function to format HTML email for order confirmation
const formatOrderConfirmationEmail = (
  order: Doc<"orders">,
  branch: Doc<"branches">
) => {
  // Format items for display
  const itemsHtml = order.items.map((item: { name?: string; quantity: number; unitPrice: number }) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || 'Unknown Item'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.unitPrice / 100).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${((item.unitPrice * item.quantity) / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  // Format order details
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">New Order Received</h2>
      
      <div style="margin-bottom: 20px;">
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Order Type:</strong> ${order.orderType || 'Not specified'}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #eee;">Quantity</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Unit Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #eee;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #eee;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right; border-top: 2px solid #eee;"><strong>₦${(order.totalAmount / 100).toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
        <p>This is an automated notification from Hogis Group Food Ordering System.</p>
      </div>
    </div>
  `;
};

// Helper function to get branch email based on branch name
const getBranchEmail = (branchName: string): string => {
  switch(branchName) {
    case "Hogis Luxury Suites Branch":
      return "hogisgrouphotels@gmail.com";
    case "Hogis Royale & Apartment Branch":
      return "hogisroyaleandapartment@gmail.com";
    case "Hogis Exclusive Suites Branch":
      return "hogisgrouphotels@gmail.com";
    default:
      return "hogisgrouphotels@gmail.com"; // Default fallback email
  }
};

// Helper function to send emails using Resend
const sendEmailWithResend = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<any> => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Hogis Orders <orders@hogisgroup.com>",
      to,
      subject,
      html: htmlContent,
    }),
  });
  
  return await response.json();
};

/**
 * INTERNAL MUTATION: Processes a verified Paystack webhook event.
 * This is called by the HTTP action after verifying the webhook signature.
 */
export const processVerifiedPaystackWebhook = internalMutation({
  args: {
    event: v.string(), // Event type from original payload
    verifiedData: verifiedPaystackData, // Use the validator for verified data structure
  },
  handler: async (ctx, args) => {
    const { event, verifiedData } = args;
    const { reference, status, metadata, amount } = verifiedData;

    // We trust this data because it came from the verified action
    console.log(`Mutation: Processing verified event ${event} for reference: ${reference}`);

    // --- Handle Verified Successful Charge Event ---
    // Status is already confirmed as 'success' by the action
    if (event === "charge.success") {
      if (metadata?.cartId && metadata?.userId) {
        // --- Shared Cart Payment Logic ---
        const cartId = metadata.cartId as Id<"sharedCarts">;
        const userId = metadata.userId;
        console.log(`Mutation: Updating shared cart payment for cart: ${cartId}, user: ${userId}`);

        const member = await ctx.db
          .query("sharedCartMembers")
          .withIndex("by_cart_user", (q) => q.eq("cartId", cartId).eq("userId", userId))
          .filter(q => q.neq(q.field("paymentStatus"), "paid"))
          .first();

        if (!member) {
          console.warn(`Mutation Warning: Shared cart member not found or already paid for cart ${cartId}, user ${userId}. Skipping.`);
          return;
        }

        await ctx.db.patch(member._id, {
          paymentStatus: "paid",
          paystackReference: reference,
          // amountPaid: amount // Store verified amount if needed
        });
        console.log(`Mutation: Marked member ${userId} as paid for cart ${cartId}.`);

        const cart = await ctx.db.get(cartId);
        if (!cart) {
          console.error(`Mutation Error: Cart ${cartId} not found after member payment.`);
          return; // Or throw?
        }

        if (cart.paymentMode === "split") {
          const allMembers = await ctx.db
            .query("sharedCartMembers")
            .withIndex("by_cart", (q: any) => q.eq("cartId", cartId))
            .collect();
          const allPaid = allMembers.every((m) => m.paymentStatus === "paid");
          if (allPaid) {
            await ctx.db.patch(cartId, { status: "completed" });
            console.log(`Mutation: Shared cart ${cartId} completed (all members paid).`);
            // Schedule email notification
            await ctx.scheduler.runAfter(0, api.paystack.sendSharedCartConfirmation, { cartId });
          } else {
            console.log(`Mutation: Shared cart ${cartId} still pending payments.`);
          }
        } else if (cart.paymentMode === "payAll" && cart.initiatorId === userId) {
          await ctx.db.patch(cartId, { status: "completed" });
          console.log(`Mutation: Shared cart ${cartId} completed (initiator paid all).`);
          // Schedule email notification
          await ctx.scheduler.runAfter(0, api.paystack.sendSharedCartConfirmation, { cartId });
        }
      } else if (metadata?.orderId) {
        // --- Regular Order Payment Logic ---
        const orderId = metadata.orderId as Id<"orders">;
        console.log(`Mutation: Updating regular order payment for order: ${orderId}`);

        const order = await ctx.db.get(orderId);
        if (!order) {
          console.warn(`Mutation Warning: Regular order ${orderId} not found for payment ref ${reference}. Skipping.`);
          return;
        }

        if (order.paymentStatus !== "Paid") {
          await ctx.db.patch(orderId, {
            paymentStatus: "Paid",
            paystackReference: reference,
          });
          console.log(`Mutation: Marked regular order ${orderId} as Paid.`);
          
          // Schedule email notification
          await ctx.scheduler.runAfter(0, api.paystack.sendOrderConfirmation, { orderId });
        } else {
          console.log(`Mutation: Regular order ${orderId} already marked as Paid. Skipping.`);
        }
      } else {
        console.warn(`Mutation Warning: Verified successful charge (ref: ${reference}) missing expected metadata.`);
      }
    } else {
      console.log(`Mutation: Ignoring verified Paystack event type: ${event}`);
    }
  },
});

interface SharedCartMember {
  userId: string;
  userName?: string;
  paymentStatus: string;
  userEmail?: string;
}

// Function to send email confirmation for successful order payment
export const sendOrderConfirmation = action({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    "use node";
    const { orderId } = args;
    
    try {
      // Get order details using getOrderWithDetails
      const order = await ctx.runQuery(api.orders.getOrderWithDetails, { orderId });
      if (!order || !order.branch) {
        throw new Error(`Order ${orderId} or its branch details not found`);
      }

      // Ensure branch has all required fields
      const fullBranch = {
        ...order.branch,
        _creationTime: Date.now(),
        operatingHours: (order.branch as any).operatingHours || [],
        supportedOrderTypes: (order.branch as { supportedOrderTypes?: ("Delivery" | "Dine-In" | "Take-out")[] }).supportedOrderTypes || ["Delivery", "Take-out"],
        contactNumber: (order.branch as { contactNumber?: string }).contactNumber || "Not provided",
        deliveryZone: (order.branch as { deliveryZone?: string }).deliveryZone || "Not specified",
        isActive: "isActive" in order.branch ? (order.branch as { isActive: boolean }).isActive : true,
        minimumOrderAmount: (order.branch as { minimumOrderAmount?: number }).minimumOrderAmount || 0
      };

      // Format email HTML
      const emailHtml = formatOrderConfirmationEmail(order, fullBranch);
      
      // Send to branch based on branch name
      const branchEmail = getBranchEmail(fullBranch.name || "Default Branch");
      await sendEmailWithResend(
        branchEmail,
        `New Order #${orderId.slice(-6)} - ${order.orderType || 'Order'}`,
        emailHtml
      );
      
      // Get user details and send customer email
      const user = await ctx.runQuery(api.users.getUserByClerkId, { userId: order.userId });
      if (user?.email) {
        await sendEmailWithResend(
          user.email,
          `Your Order #${orderId.slice(-6)} Confirmation`,
          emailHtml
        );
      }
      
      console.log(`Order confirmation emails sent for order ${orderId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send order confirmation email:`, error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
});

// Function to send email confirmation for completed shared cart
// Function to send email confirmation for completed shared cart
export const sendSharedCartConfirmation = action({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    "use node";
    const { cartId } = args;
    
    try {
      // Get shared cart details
      const cart = await ctx.runQuery(api.sharedCarts.getSharedCart, { cartId });
      if (!cart) {
        throw new Error(`Shared cart ${cartId} not found`);
      }
      
      const members = cart.members || [];
      if (!members || members.length === 0) {
        throw new Error(`No members found for shared cart ${cartId}`);
      }
      
      // Get branch details if branchId is available
      let branchEmail = "hogisgrouphotels@gmail.com"; // Default fallback
      
      if (cart.branchId) {
        // Get the branch directly using its ID
        const branch = await ctx.runQuery(api.branches.getById, { branchId: cart.branchId });
        if (branch && branch.name) {
          branchEmail = getBranchEmail(branch.name);
        }
      }
      
      // Generate email HTML with proper types
      const emailHtml = generateSharedCartEmailHtml(cart, members);
      
      // Send to branch
      await sendEmailWithResend(
        branchEmail,
        `New Group Order #${cartId.slice(-6)} - ${cart.orderType || 'Group Order'}`,
        emailHtml
      );
      
      // Send to all members with email addresses
      for (const member of members) {
        if (member.userEmail) {
          await sendEmailWithResend(
            member.userEmail,
            `Your Group Order #${cartId.slice(-6)} Confirmation`,
            emailHtml
          );
        }
      }
      
      console.log(`Shared cart confirmation emails sent for cart ${cartId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to send shared cart confirmation email:`, error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
});

// Helper function to generate shared cart email HTML
function generateSharedCartEmailHtml(cart: any, members: SharedCartMember[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Group Order Completed</h2>
      
      <div style="margin-bottom: 20px;">
        <h3>Order Details</h3>
        <p><strong>Group Order ID:</strong> ${cart._id}</p>
        <p><strong>Order Type:</strong> ${cart.orderType || 'Not specified'}</p>
        <p><strong>Total Amount:</strong> ₦${(cart.totalAmount / 100).toFixed(2)}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3>Participants</h3>
        <ul>
          ${members.map(m => `<li>${m.userName || m.userId} (${m.paymentStatus})</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
        <p>This is an automated notification from Hogis Group Food Ordering System.</p>
      </div>
    </div>
  `;
}

export const initializeTransaction = action({
  args: {
    orderId: v.id("orders"),
    email: v.string(),
    amountKobo: v.number(),
  },
  handler: async (ctx, args) => {
    "use node";
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("Action Error: PAYSTACK_SECRET_KEY not set.");
      throw new Error("Paystack initialization failed: Missing secret key configuration.");
    }

    const { orderId, email, amountKobo } = args;

    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-confirmation/`,
          metadata: { orderId },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error("Paystack initialization error:", data);
        throw new Error(`Paystack initialization failed: ${data.message || "API error"}`);
      }

      console.log("Paystack initialization successful:", data);
      return data.data.authorization_url;
    } catch (error: any) {
      console.error("Error initializing Paystack transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    }
  },
});

/**
 * ACTION: Initializes a Paystack transaction for a shared cart.
 */
export const initializeSharedCartTransaction = action({
  args: {
    cartId: v.id("sharedCarts"),
    userId: v.string(),
    email: v.string(),
    amountKobo: v.number(),
  },
  handler: async (ctx, args) => {
    "use node";
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("Action Error: PAYSTACK_SECRET_KEY not set.");
      throw new Error("Paystack initialization failed: Missing secret key configuration.");
    }

    const { cartId, userId, email, amountKobo } = args;

    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-confirmation/`,
          metadata: { cartId, userId },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error("Paystack initialization error:", data);
        throw new Error(`Paystack initialization failed: ${data.message || "API error"}`);
      }

      console.log("Paystack initialization successful:", data);
      return data.data.authorization_url;
    } catch (error: any) {
      console.error("Error initializing Paystack transaction:", error);
      throw new Error(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
    }
  },
});

export { verifiedPaystackData };