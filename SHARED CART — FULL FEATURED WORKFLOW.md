🧠 1. Core Concept Overview
A shared cart is a temporary cart tied to a group of users (e.g., friends, colleagues) who can collectively add items and pay.

One user (the initiator) starts the cart and can invite others.

Users can either:

Split payment equally (or manually assigned).

Or the initiator can choose to pay for everyone.

Payments are processed via Paystack.

Convex handles:

Real-time updates to the cart

Queueing (e.g., delayed verification)

Cron jobs (e.g., cart expiration, payment reminders)

🧩 2. Feature Breakdown
Feature	Description
Create Shared Cart	One user creates the cart and is labeled the initiator.
Invite Members	The initiator can invite others via a unique group ID or shareable link.
Add Items	All members can add items to the shared cart.
Live Sync	Everyone sees live updates of the cart (items, total, contributors).
View Summary	Shows each user’s contributions and total breakdown.
Choose Payment Method	The initiator decides: Split Payment or Pay All.
Pay	Redirected to Paystack for secure checkout.
Confirm Payment	Paystack sends a webhook to update status in Convex.
Completion	Once everyone has paid (or the initiator pays all), the cart is marked completed.
Expiry	If no one pays after a set time, the cart expires automatically.
🛠️ 3. User Flow (Step-by-Step)
🟩 PHASE 1: Create & Share Cart
Initiator creates a shared cart

Generates a group ID or shareable link.

Selects “Split Payment” or “Pay for All” (this can be changed before payment begins).

Initiator invites others

Users join via shared link or code.

Everyone sees the cart in real-time.

All users add items

Each user browses products and adds to the shared cart.

Their identity is tagged to each item.

View cart summary

Shows:

All items in the cart

Who added what

Quantity and price

Total amount

🟨 PHASE 2: Payment Selection
Option 1: Split Payment

The total is divided equally or based on each user’s items.

Each user sees their payment responsibility.

Each initiates a Paystack payment link independently.

Option 2: Pay For All

The initiator clicks "Pay for Everyone."

Total sum is calculated.

A single Paystack checkout link is generated.

Cart locks and no one else can initiate payment.

🟦 PHASE 3: Payment Handling
Redirect to Paystack

Secure transaction page.

Returns status (success/failure).

Paystack Webhook hits backend

Verifies the payment.

Updates each user's payment status in Convex.

Payment Completion Logic

If Split Payment → all users must successfully pay.

If Pay For All → only initiator’s payment is required.

Cart marked as completed

Confirmation message shown.

Items are processed for delivery or checkout.

🟥 PHASE 4: Failures & Cleanup
Unpaid/Failed Transactions

Cart shows warning.

Retry option shown.

Reminder notifications

Optional email or in-app reminder for pending payments.

Auto-expire carts

Cron job checks carts every hour.

Carts older than X hours/days and unpaid → marked as expired.

🔄 4. Background Logic (Convex-powered)
Mechanism	Purpose
Queues	Retry webhook verification, handle delayed processing
Cron Jobs	Auto-expire abandoned carts, send payment reminders
Real-time sync	Instant UI updates when items are added or payments confirmed
Access control	Only members can modify the cart, only the initiator can choose payment mode
Status tracking	Cart status: open, locked, completed, expired
Transaction log	Log of all actions: item added, payment initiated, etc.
🔐 5. Security Measures
Webhook signature verification (to confirm Paystack calls are legit).

Restrict cart changes when payment is in progress.

Prevent duplicate payments per user.

Ensure all payments are associated with the right cart and user.

🎁 6. Bonus Features You Could Add
Feature	Benefit
🧾 Receipt Per User	Shows what each person paid for (email or in-app)
🧠 Saved Carts	Users can reuse or duplicate old shared carts
🧑‍🤝‍🧑 Comments	Members can comment in the cart (e.g., “Don’t forget drinks!”)
🔄 Manual Adjustment	Initiator can assign custom amounts (e.g., Uche pays ₦5k, Tola ₦2k)
🔔 Real-Time Alerts	Notify members when new items are added or payment is made
📊 History Analytics	Users can see their previous shared cart sessions and orders
