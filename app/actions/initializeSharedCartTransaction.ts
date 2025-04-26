"use server";

import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY is not set");
}

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
  userId,
  email,
  amountKobo,
}: {
  cartId: Id<"sharedCarts">;
  userId: string;
  email: string;
  amountKobo: number;
}) {
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
      email: email,
      amount: amountKobo,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata, // Pass the metadata object directly, don't stringify
  };

  console.log("Initializing Paystack transaction via fetch for shared cart with payload:", payload);

  try {
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload), // The entire payload gets stringified here
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