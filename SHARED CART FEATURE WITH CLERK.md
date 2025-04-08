1. Core Concept
A Shared Cart lets a group jointly build and pay for an order.

Initiator: the Clerk‑authenticated user who creates the cart.

Members: other signed‑in Clerk users who join via link or code.

Payment modes:

Split Payment: each member pays their share.

Pay for All: initiator covers the entire bill.

Convex handles real‑time sync, built‑in queues for retries/delays, and cron jobs for expiration/reminders. Paystack processes money. Clerk ensures only authenticated users can act.

2. Feature Breakdown
Feature	Description
Create Cart	Initiator (Clerk user) opens a new cart → unique ID/link → initial status = “open.”
Invite Members	Share link or code → only Clerk‑signed‑in users can join.
Add Items	Any member browses menu, adds items tagged with their Clerk userId.
Live Sync	All members see instant updates (items, totals, contributors).
View Summary	Breakdown by user: items added, quantity, price, subtotal.
Choose Payment	Initiator picks Split or Pay All (can toggle until checkout starts).
Initiate Payment	
Split: each member clicks “Pay My Share” → Paystack checkout.

Pay All: initiator clicks “Pay for All” → one Paystack checkout. | | Webhook Handling | Paystack notifies via webhook → Convex queue verifies & updates payment status. | | Completion |

Split: once every member’s payment is confirmed, cart → “completed.”

Pay All: once initiator’s payment succeeds, cart → “completed.” | | Expiration | Cron job runs (e.g., hourly) → carts “open” > X hours without full payment → “expired.”| | Reminders | Cron job sends in‑app/email nudges to unpaid members after a delay. |

3. User Flow
🟩 Phase 1: Setup & Sharing
Sign In

Clerk ensures user identity and session.

Create Cart

Initiator clicks “New Group Order,” chooses initial payment mode (Split vs Pay All).

Convex records: cart ID, creator’s Clerk userId, status=open.

Invite Members

Shareable link or code sent via chat/email.

Members click link → Clerk login → auto‑join.

🟨 Phase 2: Building the Cart
Add Items

Any member selects menu items, customizes, and adds to cart.

Convex real‑time updates broadcast to all members.

View Live Summary

Shows all items, who added them, per‑user subtotals, overall total.

Modify Payment Mode

Initiator can switch between Split or Pay All until someone starts checkout.

🟦 Phase 3: Checkout
Initiate Payment

Split: each member sees their amount and clicks “Pay My Share.”

Pay All: initiator clicks “Pay for All” to cover full amount.

Redirect to Paystack

Payment page opens; metadata includes cart ID + Clerk userId.

Payment Confirmation

Paystack webhook → Convex queue job verifies signature & payment status.

🟥 Phase 4: Finalization & Cleanup
Mark Paid

Convex updates each member’s payment record.

If Split, waits for all members; if Pay All, one payment suffices.

Complete Cart

Once conditions met, cart status → “completed.”

UI shows confirmation to all members.

Failures & Retries

Queue jobs retry any webhook failures.

Members can retry failed payments.

4. Background Automation (Convex)
Mechanism	Purpose
Real‑Time	useQuery subscriptions keep UI in sync on items, totals, payment status.
Queues	
Retry webhook processing on transient errors.

Delay verification jobs (e.g., “verifyPaymentLater” after 5 min). | | Cron Jobs |

Expire Carts: every hour, carts “open” > 3 hrs → status=”expired.”

Send Reminders: daily or hourly nudge to unpaid members. | | Access Control | Only members (Clerk userIds) can view/modify; only initiator can toggle pay mode. |

5. Security & Integrity
Clerk Authentication: every action checked against Clerk session.

Webhook Verification: confirm Paystack signatures before updating DB.

Permission Guards:

Only cart members can add items or pay.

Only initiator can “Pay All” or change payment mode.

Idempotency: ensure duplicate webhook calls or retries don’t double‑count payments.

6. Bonus Features
Feature	Benefit
🧾 Per‑User Receipts	Email or in‑app breakdown of each user’s items & payments.
💬 In‑Cart Chat/Notes	Members can leave comments (“add extra napkins!”).
🔄 Manual Adjustments	Initiator assigns custom amounts (e.g., Alice pays ₦5k, Bob ₦3k).
📊 Order History	Saved shared carts for easy reordering or analytics.
🔔 Push Notifications	Real‑time alerts when items are added or payments complete.
🆔 Guest Mode	Allow non‑Clerk guests with temp IDs (limited access).
