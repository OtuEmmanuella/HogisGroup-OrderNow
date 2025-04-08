"use server";

// Removed Paystack library import
// import Paystack from "paystack-node";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
// Remove: import { TICKET_STATUS } from "@/convex/constants";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

// Structure for successful refund data (optional, for logging/checking)
interface PaystackRefundData {
    status: boolean;
    message: string;
    data?: {
        transaction: Record<string, unknown>; // Use Record<string, unknown> instead of any
        refund: Record<string, unknown>; // Use Record<string, unknown> instead of any
    }
}

// Change argument to orderId
export async function refundPaystackTransaction(orderId: Id<"orders">) {
  console.log("Starting refund process via fetch for order:", orderId);

  // Get order details
  // Use getOrderWithDetails or simpler query if only reference and status are needed
  const order = await convex.query(api.orders.getOrderWithDetails, { orderId }); 
  if (!order) throw new Error(`Order not found: ${orderId}`);

  // Check if order has a Paystack reference
  if (!order.paystackReference) {
    console.warn(`Order ${order._id} is missing Paystack reference, cannot refund.`);
    // Depending on business logic, maybe still cancel the order in Convex?
    // For now, throw an error as refund is impossible.
    throw new Error(`Order ${order._id} cannot be refunded: Missing Paystack reference.`);
  }

  // Check if order is in a refundable state (e.g., not already cancelled/refunded/pending)
  // Add more statuses if needed
  const refundableStatuses: string[] = ["Received", "Preparing", "Ready for Pickup", "Out for Delivery"]; 
  if (!refundableStatuses.includes(order.status)) {
      console.warn(`Order ${order._id} has status ${order.status}, which is not refundable.`);
      throw new Error(`Order ${order._id} cannot be refunded due to its current status (${order.status}).`);
  }

  console.log(`Attempting refund via fetch for order ${order._id} with reference ${order.paystackReference}`);
  const refundPayload = {
      transaction: order.paystackReference,
      // amount: order.totalAmount ? order.totalAmount * 100 : undefined // Optional: Full refund if omitted. Paystack defaults to full.
  };

  let refundResult: { success: boolean; message?: string; refundData?: PaystackRefundData["data"] } = { success: false };

  try {
     // Issue refund through Paystack using fetch
     const response = await fetch(`${PAYSTACK_API_URL}/refund`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(refundPayload),
     });

     console.log(`Fetch Refund Status Code for Ref ${order.paystackReference}:`, response.status);

     let responseData: PaystackRefundData | { message?: string, status?: boolean }; 
     try {
         responseData = await response.json();
     } catch (parseError) {
         console.error("Could not parse Paystack refund response body:", parseError);
         throw new Error(`Paystack API communication error (${response.status}). Could not parse refund response.`);
     }

     console.log(`Parsed Paystack Refund Response for Ref ${order.paystackReference}:`, responseData);

     if (!response.ok) {
         console.error(`Paystack API refund request failed for Ref ${order.paystackReference}:`, { status: response.status, body: responseData });
         throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
     }

     if (!responseData || !responseData.status) { 
         console.error(`Paystack refund failed based on response data for Ref ${order.paystackReference}:`, responseData);
         throw new Error(responseData?.message || `Paystack refund failed for reference ${order.paystackReference}`);
     }

     console.log(`Refund successful via fetch for reference ${order.paystackReference}.`);
     
     // Safely access refund data only on success structure
     const actualRefundData = (responseData as PaystackRefundData).data; 
     
     refundResult = { 
         success: true, 
         message: "Refund processed successfully by Paystack.", 
         refundData: actualRefundData // Use the safely accessed data
     };

    // Update order status in Convex to "Cancelled" (or a dedicated "Refunded" status if you add one)
    // Use the public updateOrderStatus mutation (assuming appropriate auth checks within it)
    await convex.mutation(api.orders.updateOrderStatus, {
      orderId: order._id,
      status: "Cancelled", // Or "Refunded"
    });
    console.log(`Updated order ${order._id} status to Cancelled in Convex.`);

  } catch (error: unknown) {
    // Catch fetch/parsing errors or errors thrown from checks
    console.error(`Failed to process refund for order ${order._id} (Ref: ${order.paystackReference}):`, error);
     let errorMessage = "Unknown refund processing error";
     if (error instanceof Error) {
         errorMessage = error.message;
     }
     // Store failure details, but don't re-throw immediately if we want to return status
     refundResult = { success: false, message: errorMessage };
     // Re-throw the error to indicate failure to the caller
     throw new Error(`Refund Failed: ${errorMessage}`); 
  }

  // Return the outcome
  return refundResult;
} 