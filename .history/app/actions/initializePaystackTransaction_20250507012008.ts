"use server";

import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
import { auth } from "@clerk/nextjs/server";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

export type PaystackMetadata = {
  orderId: Id<"orders">;
  userId: string;
  cancel_action: string;
};

// Structure of expected successful response data
interface InitializeSuccessData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export async function initializePaystackTransaction({
  orderId,
}: {
  orderId: Id<"orders">;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  // Get order details
  const order = await convex.query(api.orders.getOrderWithDetails, { orderId });
  if (!order) throw new Error("Order not found");
  if (order.status !== 'Pending Confirmation') {
      throw new Error(`Order status is already ${order.status}, cannot initiate payment.`);
  }
  if (order.userId !== userId) {
      throw new Error("User does not match order owner.");
  }

  // Get user details for email
  const user = await convex.query(api.users.getUserById, { userId });
   if (!user || !user.email) throw new Error("User email not found");

  // Get amount from order
  if (typeof order.totalAmount !== 'number' || order.totalAmount < 0) {
      throw new Error("Invalid order total amount.");
  }
  const amountInKobo = Math.round(order.totalAmount);
   if (amountInKobo <= 0) {
       throw new Error("Order total must be positive to initiate payment.");
   }

  // Update URLs
  const cancelUrl = `${baseUrl}/checkout`;
  const callbackUrl = `${baseUrl}/payment/success`;

  const metadata: PaystackMetadata = {
    orderId,
    userId,
    cancel_action: cancelUrl,
  };

  const payload = {
      email: user.email,
      amount: amountInKobo,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: metadata, // Pass the object directly
  };

  console.log("Initializing Paystack transaction via fetch for order with payload:", payload);

  try {
     const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(payload),
     });

     console.log("Fetch Initialize Transaction Status Code:", response.status);

     let responseData;
     try {
       responseData = await response.json();
     } catch (parseError) {
       console.error("Could not parse Paystack response body:", parseError);
       throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
     }

     console.log("Parsed Paystack Initialize Response:", responseData);

     if (!response.ok) {
         console.error("Paystack API initialize transaction request failed:", { status: response.status, body: responseData });
         throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
     }

     if (!responseData || !responseData.status || !responseData.data?.authorization_url || !responseData.data?.reference) {
         console.error("Invalid Paystack response structure after transaction initialize:", responseData);
         throw new Error(responseData.message || "Failed to initialize transaction or invalid response structure.");
     }

    const data = responseData.data as InitializeSuccessData;
    console.log("Paystack transaction initialized successfully via fetch:", data.reference);

    // Save the reference to the order in Convex
    try {
        await convex.mutation(api.orders.addPaystackReference, {
            orderId: orderId,
            paystackReference: data.reference
        });
        console.log(`Saved Paystack reference ${data.reference} to order ${orderId}`);
    } catch (updateError) {
        console.error(`Failed to save Paystack reference to order ${orderId}:`, updateError);
        throw new Error("Payment initialized but failed to update order with payment reference. Please contact support.");
    }

    return {
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: data.reference,
    };

  } catch (error: unknown) {
     console.error("Error during Paystack transaction initialization fetch/processing:", error);
     let errorMessage = "Failed to initialize Paystack transaction.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
     throw new Error(errorMessage);
  }
}