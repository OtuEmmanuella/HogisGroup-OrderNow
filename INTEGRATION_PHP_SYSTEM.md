# Documentation: Integrating Next.js/Convex Ordering App with PHP Management System

## 1. Overview

This document outlines the process for integrating the Next.js/Convex-based online ordering system with the existing PHP-based management software used for sales, accounting, auditing, and cashiering.

The goal is to automatically send confirmed order details from the online ordering system to the PHP system, allowing cashiers, accountants, and auditors to view and process these orders within their familiar software environment.

## 2. Integration Flow

1.  **Order Placement (Next.js App):** A customer places an order (dine-in, takeout, or delivery) and completes payment (e.g., via Paystack).
2.  **Payment Confirmation (Paystack/Convex):** The payment is successfully processed. This is typically confirmed via a Paystack webhook received by a Convex HTTP endpoint or a subsequent Convex action triggered after successful payment redirection.
3.  **Order Data Transmission (Convex Backend):** Upon successful payment confirmation and order status update (e.g., to 'Paid' or 'Processing'), a Convex action/mutation is triggered.
4.  **API Call to PHP System:** The Convex action makes a secure HTTP POST request to a dedicated API endpoint provided by the PHP management system.
5.  **Data Reception & Processing (PHP System):** The PHP system receives the order data, validates it, and incorporates it into its database/workflow for cashier processing, accounting, and auditing.
6.  **Response Handling (Convex Backend):** The Convex action handles the response from the PHP API (success or failure) and logs the outcome appropriately.

## 3. Responsibilities

### 3.1. Next.js/Convex Developer (You)

- Identify the exact trigger point in the Convex backend logic (e.g., within the Paystack webhook handler or a subsequent order processing action) where the integration call should occur.
- Modify the relevant Convex action/mutation to:
  - Gather all necessary order details.
  - Format the data according to the agreed-upon structure (see Section 4).
  - Make a secure HTTP POST request to the PHP API endpoint.
  - Implement error handling and logging for the API call.
- Add necessary environment variables for the PHP API endpoint URL and any required security tokens/keys.
- Collaborate with the PHP developer on defining the data payload and security mechanism.

### 3.2. PHP Management System Developer

- Create a secure API endpoint (URL) that can receive HTTP POST requests.
- Define the expected data format (JSON payload structure) for incoming orders.
- Implement validation for incoming data.
- Develop the logic to process the received order data and integrate it into the PHP system's database and workflows (e.g., display for cashiers, record for accounting).
- Define and implement a security mechanism (e.g., API key in header, shared secret for signature verification) to authenticate requests from the Convex backend.
- Provide the API endpoint URL, expected data format documentation, and security details to the Next.js/Convex developer.
- Define the expected success/error response format for the API endpoint.

## 4. Data Payload (Example - To Be Finalized)

The following is a suggested JSON structure for the data sent from Convex to the PHP API. This needs to be reviewed and finalized with the PHP developer.

```json
{
  "orderId": "convex_order_id_string", // Unique ID from Convex
  "orderReference": "human_readable_ref", // e.g., HOGIS-12345
  "orderTimestamp": "ISO8601_datetime_string", // When the order was placed/confirmed
  "orderType": "dine-in" | "takeout" | "delivery",
  "customer": {
    "name": "Customer Name",
    "phone": "Customer Phone",
    "email": "customer@example.com", // Optional
    "deliveryAddress": "Delivery Address String" // Only if orderType is 'delivery'
  },
  "items": [
    {
      "itemId": "menu_item_id_string",
      "name": "Item Name",
      "quantity": 2,
      "unitPrice": 1500.00,
      "totalPrice": 3000.00,
      "notes": "Extra spicy" // Optional customer notes for the item
    }
    // ... more items
  ],
  "subtotal": 4500.00,
  "deliveryFee": 500.00, // If applicable
  "discount": 0.00, // If applicable
  "totalAmount": 5000.00,
  "payment": {
    "method": "Paystack", // Or other methods if added
    "status": "Paid",
    "transactionReference": "paystack_ref_string"
  },
  "branch": {
     "id": "branch_id_string", // Identifier for the specific branch
     "name": "Hogis Luxury Suites"
  }
  // Add any other relevant fields required by the PHP system
}
```

## 5. Security

- **Recommendation:** Use a shared secret key. The Convex backend will generate an HMAC signature of the payload using the secret and include it in a custom HTTP header (e.g., `X-Webhook-Signature`). The PHP endpoint will verify this signature using the same secret key before processing the request.
- Alternatively, use a static API key sent in an `Authorization: Bearer <key>` header.
- The API endpoint on the PHP side **must** use HTTPS.
- Store the secret key or API key securely in Convex environment variables.

## 6. Implementation Steps (Next.js/Convex Side)

1.  **Confirm Trigger:** Decide if the API call happens within the Paystack webhook handler (`convex/http.ts` or similar) after verifying payment and updating the order, or in a separate action triggered by the order status change.
2.  **Get PHP API Details:** Obtain the API endpoint URL, agreed data format, and security key/secret from the PHP developer.
3.  **Store Secrets:** Add the PHP API URL and secret key as environment variables in your Convex deployment settings.
4.  **Modify Convex Action/Mutation:**
    - Import necessary environment variables.
    - Fetch the full order details required for the payload.
    - Construct the JSON payload.
    - Implement the chosen security mechanism (e.g., generate HMAC signature).
    - Use `fetch` within the Convex action/mutation to make the POST request to the PHP API endpoint, including appropriate headers (Content-Type: application/json, Authorization/Signature header).
    - Handle the response: Log success or failure. Consider retry logic or marking the order for manual intervention if the API call fails persistently.
5.  **Testing:** Thoroughly test the integration with sample orders and coordinate with the PHP developer for end-to-end testing.

## 7. Error Handling & Logging

- Log all attempts to send data to the PHP API.
- Log success responses and any error responses received from the PHP API.
- Implement retry logic for transient network errors if appropriate.
- Consider a mechanism (e.g., a flag on the order document in Convex) to indicate if the order was successfully sent to the PHP system.
- Alert administrators if sending data fails repeatedly.
