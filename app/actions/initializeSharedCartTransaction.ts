"use server";

import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
// import { auth } from "@clerk/nextjs/server"; // Removed unused import

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

const convex = getConvexClient();

export type PaystackSharedCartMetadata = {
  cartId: Id<"sharedCarts">;
  userId: string; // User initiating payment
  cancel_action: string;
};

// Structure of expected successful response data
interface InitializeSuccessData {
    authorization_url: string;
    access_code: string;
    reference: string;
}

export async function initializeSharedCartTransaction({
  cartId,
  userId, // Clerk User ID of the person paying
  email, // Email of the person paying
  amountKobo, // Amount to charge (already calculated)
}: {
  cartId: Id<"sharedCarts">;
  userId: string;
  email: string;
  amountKobo: number;
}) {
  // No need to re-authenticate here as userId is passed in
  // const { userId: authUserId } = await auth();
  // if (!authUserId || authUserId !== userId) throw new Error("User mismatch or not authenticated");

  // Get shared cart details (optional, could rely on passed amount)
  // Corrected function name from getSharedCartById to getSharedCart
  const sharedCart = await convex.query(api.sharedCarts.getSharedCart, { cartId });
  if (!sharedCart) throw new Error("Shared cart not found");

  // Validate amount
  if (typeof amountKobo !== 'number' || amountKobo <= 0) {
      throw new Error("Invalid payment amount.");
  }

  // Update URLs
  const cancelUrl = `${baseUrl}/shared-cart/${cartId}`; // Redirect back to cart on cancel
  const callbackUrl = `${baseUrl}/payment/success?cartId=${cartId}`; // Include cartId for success handling

  const metadata: PaystackSharedCartMetadata = {
    cartId,
    userId,
    cancel_action: cancelUrl,
  };

  const payload = {
      email: email, // Use the provided email
      amount: amountKobo, // Use the provided amount
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: JSON.stringify(metadata),
      // Add reference if you want to pre-generate one, otherwise Paystack generates
  };

  console.log("Initializing Paystack transaction via fetch for shared cart with payload:", payload);

  try {
     const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(payload),
     });

     console.log("Fetch Initialize Shared Cart Transaction Status Code:", response.status);

     let responseData;
     try {
       responseData = await response.json();
     } catch (parseError) {
       console.error("Could not parse Paystack response body:", parseError);
       throw new Error(`Paystack API communication error (${response.status}). Could not parse response.`);
     }

     console.log("Parsed Paystack Initialize Shared Cart Response:", responseData);

     if (!response.ok) {
         console.error("Paystack API initialize shared cart transaction request failed:", { status: response.status, body: responseData });
         throw new Error(`Paystack API Error (${response.status}): ${responseData?.message || response.statusText}`);
     }

     if (!responseData || !responseData.status || !responseData.data?.authorization_url || !responseData.data?.reference) {
         console.error("Invalid Paystack response structure after shared cart transaction initialize:", responseData);
         throw new Error(responseData.message || "Failed to initialize transaction or invalid response structure.");
     }

    const data = responseData.data as InitializeSuccessData;
    console.log("Paystack shared cart transaction initialized successfully via fetch:", data.reference);

    // Save the reference to the shared cart in Convex
    try {
        // TODO: Add a mutation in convex/sharedCarts.ts to store this reference
        // Example: await convex.mutation(api.sharedCarts.addPaystackReference, {
        //     cartId: cartId,
        //     paystackReference: data.reference
        // });
        console.log(`Paystack reference ${data.reference} generated for shared cart ${cartId}. Need to store it.`);
    } catch (updateError) {
        console.error(`Failed to save Paystack reference to shared cart ${cartId}:`, updateError);
        // Decide if this should be a fatal error
        // throw new Error("Payment initialized but failed to update shared cart with payment reference. Please contact support.");
    }

    // Return only the URL needed by the frontend
    return data.authorization_url;

  } catch (error: unknown) {
     console.error("Error during Paystack shared cart transaction initialization fetch/processing:", error);
     let errorMessage = "Failed to initialize Paystack transaction for shared cart.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
     throw new Error(errorMessage);
  }
}