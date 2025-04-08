# Documentation: Converting Ticket Platform to Hogis Fast Food Ordering

**1. Introduction**

This document details the process of transforming the existing ticketing platform into a fully functional fast-food ordering system for Hogis branches. The conversion prioritizes reusing the current technology stack (Convex, Clerk, Paystack, Tailwind, Shadcn) and its core logic (real-time capabilities, user management, payment processing) while adapting it to the new food-ordering context. Key features include branch selection, multiple order types (Delivery, Dine-In, Take-out), real-time order tracking, and integration with Mapbox and Brevo.

**2. Core Architecture Transformation**

The fundamental step involves remapping the core data models and concepts from the ticketing domain to the fast-food ordering domain.

- **Entities Mapping:**
  - `Ticket` → `Order`: Represents a customer's food order.
  - `Event` → `Menu Category`: Represents groupings of food items (e.g., Burgers, Drinks, Sides). Potentially, top-level `Event` could represent the entire Menu for a branch.
  - `Venue` → `Branch`: Represents the physical restaurant locations.
  - `Attendee` / `User` → `Customer`: Represents the end-user placing the order (Leveraging existing Clerk users).
  - `TicketType` → `MenuItem` / `MenuItemVariant`: Represents individual food items and their possible variations (e.g., size, specific ingredients).
- **Convex Schema Adaptation:** Existing Convex schemas will be modified or replaced. The real-time capabilities used for ticket availability will be repurposed for menu item availability, order capacity management per branch/time slot, and real-time order status updates.

**3. Branch Selection & Location Services**

Users must select a specific Hogis branch before placing an order.

- **Branch Model:**
  - Adapt the existing `Venue` data model in Convex to become the `Branch` model.
  - Key attributes: Name, Address, Operating Hours, Supported Order Types (Delivery, Dine-In, Take-out), Delivery Zone boundaries, Contact Info.
  - Seed the initial branches:
    1.  Hogis Luxury Suites
    2.  Hogis Royale & Apartment
    3.  Hogis Exclusive Suites
- **Location Integration (Mapbox):**
  - **Branch Display:** Use Mapbox GL JS to display branch locations on an interactive map during selection.
  - **Delivery Radius/Zone:** Integrate Mapbox APIs (Geocoding, potentially Turf.js with Convex) to:
    - Verify if a customer's address falls within the selected branch's delivery zone.
    - Calculate estimated delivery fees based on distance (using Directions API or Distance Matrix API).
  - **Estimated Times:** Use the Mapbox Directions API to provide estimated delivery times based on traffic conditions (requires integration with order preparation time).
  - **User Experience:** On the branch selection screen, potentially use the browser's Geolocation API (with user permission) to suggest the nearest branch.

**4. Order Type System**

Introduce a system allowing users to choose how they want to receive their order.

- **Types:**
  1.  **Delivery:** Requires collecting the customer's delivery address. Integrates with Mapbox for address validation and fee calculation.
  2.  **Dine-In:** May involve selecting a table number or specifying the number of guests (depending on operational requirements). Requires defining table availability logic if needed.
  3.  **Take-out (Pickup):** Requires selecting an estimated pickup time slot based on branch capacity and preparation times.
- **Convex Implementation:**
  - Add an `orderType` field to the `Order` schema.
  - Include conditional fields based on `orderType`: `deliveryAddress` (object), `tableNumber` (string/integer), `pickupTime` (datetime).
  - Adapt real-time availability logic: Instead of seat availability, track order capacity per time slot for each branch and order type (e.g., limit simultaneous pickups, manage delivery driver assignments).

**5. Menu System**

Replace the event/ticket structure with a hierarchical menu system.

- **Structure:**
  - `Menu Category`: Top-level groups (e.g., "Burgers", "Sides", "Drinks", "Desserts"). Corresponds roughly to `Event`.
  - `MenuItem`: Individual items within categories (e.g., "Classic Cheeseburger", "Fries", "Cola"). Corresponds roughly to `TicketType`.
- **MenuItem Attributes:**
  - Name, Description, Price, Image URL, Dietary Information (e.g., vegetarian, gluten-free tags), Availability Status (in/out of stock).
  - **Customization Options:** Define nested structures or linked models for item variations (e.g., Size: Small/Medium/Large; Add-ons: Extra Cheese, Bacon; Exclusions: No Onions). This mirrors the complexity of tiered ticketing or add-ons.
- **Convex Implementation:** Create `MenuCategory` and `MenuItem` schemas. Link `MenuItems` to `MenuCategories`. Implement logic for handling item variants and customizations, possibly using embedded objects or separate linked documents in Convex. The user will be responsible for seeding this data initially via the admin panel or scripts.

**6. User Order Flow**

Define the step-by-step process for a customer placing an order.

1.  **Onboarding & Branch Selection:**
    - _(Covered in Section 7: User Accounts & Experience)_
    - User selects a branch (map view or list view). Location suggestion enhances this.
2.  **Order Type Selection:**
    - User chooses "Delivery", "Dine-In", or "Take-out". UI updates accordingly (e.g., prompts for address if Delivery is chosen).
3.  **Menu Browsing & Customization:**
    - Display menu categories and items for the selected branch.
    - Users select items, choose options/customizations, and specify quantity.
    - Add items to a persistent cart (leveraging Convex for real-time cart updates across devices if the user is logged in).
4.  **Cart & Checkout:**
    - User reviews items, quantities, customizations, and subtotal in the cart.
    - Proceed to Checkout:
      - Collect necessary details (address for Delivery, contact info, pickup time selection for Take-out).
      - Display calculated delivery fees (if applicable).
      - Show available payment methods (reuse Paystack integration).
      - User confirms details and initiates payment via Paystack.
5.  **Order Confirmation:**
    - Display a success message with order summary, unique order ID, and estimated delivery/pickup time.
    - Trigger confirmation notification (Email/SMS via Brevo).

**7. Real-time Order Tracking**

Provide customers with live updates on their order status.

- **Status Workflow:** Define distinct order statuses (e.g., `Pending Confirmation`, `Received`, `Preparing`, `Ready for Pickup`, `Out for Delivery`, `Completed`, `Cancelled`).
- **Convex Real-time:**
  - Store the `orderStatus` field in the `Order` document.
  - Use Convex's real-time subscriptions (`useQuery`) on the frontend to listen for changes to the order status.
  - The admin panel/kitchen interface will update the status in Convex, which automatically reflects in the customer's UI.
- **User Interface:** Display the current status clearly on the order tracking page (accessible via Order History). Show a visual progress bar or timeline.
- **(Advanced):** For delivery, potentially integrate Mapbox Directions API to show a live map of the delivery driver's location if feasible operationally.

**8. User Accounts & Experience (Clerk & Onboarding)**

Leverage Clerk for authentication and enhance the user profile and initial experience.

- **Authentication:** Continue using Clerk for sign-up, sign-in, and user session management.
- **User Profile Enhancement:** Extend the user profile data (stored potentially in Convex linked to Clerk User ID) to include:
  - `Order History`: List of past and current orders with status and details.
  - `Saved Addresses`: Manage multiple delivery addresses.
  - `Favorite Items`: Allow users to 'heart' or save frequently ordered items for quick reordering.
  - `(Optional)` Saved Payment Methods (if supported securely via Paystack).
- **Onboarding Flow:**
  1.  **Welcome:** A clean initial screen introducing Hogis ordering.
  2.  **Location Permission (Optional):** Politely request browser location access to suggest the nearest branch. Provide a manual selection fallback.
  3.  **Branch Suggestion/Selection:** Highlight the nearest branch or present the list/map for manual selection.
  4.  **Order Type Explanation:** Briefly (e.g., in a dismissible modal or tooltip upon first interaction) explain the differences between Delivery, Dine-In, and Take-out.
  5.  **First-Time Incentive (Optional):** Display a banner or offer a promo code for the user's first order to encourage conversion.

**9. Admin Panel Adaptation**

Modify the existing admin interface to manage the fast-food operations.

- **Menu Management:** Create/Update/Delete Menu Categories and Menu Items (including pricing, images, descriptions, customizations, availability).
- **Branch Management:** Configure branch details (address, hours, delivery zones via Mapbox interface, contact info, supported order types).
- **Order Dashboard:** View incoming orders in real-time, filter by branch/status/type, update order status (triggering customer notifications), manage order capacity/throttling.
- **Analytics:** Adapt sales reports to show food sales data, popular items, peak hours, revenue per branch, order type distribution.
- **(Optional) Inventory Management:** Basic tracking of key ingredients tied to menu items to manage stock levels automatically.
- **(Optional) Kitchen Display System (KDS) Integration:** If a dedicated KDS is used, provide an API endpoint or mechanism for orders to be pushed to it from Convex.

**10. Notifications & Automation (Brevo)**

Utilize Brevo for automated communication triggered by order events.

- **Trigger Points:** Integrate Convex Functions or backend logic to trigger Brevo API calls based on changes in the `Order` documents (e.g., creation, status updates).
- **Key Automations:**
  - **Order Confirmation:** Email/SMS with full order details and estimated time upon successful payment.
  - **Preparation Started:** Notification when the kitchen begins preparing the order.
  - **Ready for Pickup:** Alert when a Take-out order is ready.
  - **Out for Delivery:** Notification when a Delivery order leaves the branch (potentially with a tracking link).
  - **Order Completed/Delivered:** Confirmation message.
  - **Feedback Request:** Email sent sometime after completion asking for a rating/review.
  - **(Optional) Order Issues:** Notifications for delays or cancellations.
  - **(Marketing)** Promotional emails (requires user opt-in).

**11. Additional Fast-Food Features**

Consider these common features to enhance the platform:

- **Promotions & Discounts:** Implement a system for applying promo codes (fixed amount or percentage) at checkout. Allow for automatic discounts (e.g., "10% off first order").
- **Customer Feedback:** Integrate a simple rating (e.g., 1-5 stars) and optional comment system for completed orders.
- **Operating Hours Logic:** Prevent users from placing orders outside of a branch's configured operating hours or for unavailable time slots.
- **Scheduled Orders:** Allow users to place orders in advance for a future date/time slot (similar logic to event scheduling).
- **Group Ordering:** (Future enhancement) Allow multiple users to add items to a single cart before checkout.

**12. Technical & Performance Considerations**

Maintain performance and reliability:

- **Convex:** Continue leveraging its real-time capabilities for a smooth UX. Optimize queries and data structures.
- **Image Optimization:** Use appropriate image formats (e.g., WebP) and sizes for menu items. Implement lazy loading. Consider using an image CDN.
- **Mapbox API:** Monitor API usage to stay within limits. Cache geocoding results where appropriate.
- **Paystack:** Ensure the integration is robust and handles payment confirmation webhooks correctly to update order status reliably.
- **Clerk:** Rely on Clerk for secure user management.
- **Code Splitting:** Ensure efficient loading of different parts of the application (e.g., Mapbox components only loaded when needed).

**13. Implementation Roadmap (Summary)**

A phased approach is recommended:

1.  **Phase 1: Core Conversion:** Implement Branch model, Menu structure (Categories/Items), basic Order schema, adapt Convex models. Get basic menu display and cart functionality working without order types or delivery.
2.  **Phase 2: Order Types & Basic Flow:** Implement the Order Type selection logic, basic checkout flow (without delivery specifics), Paystack integration for payments.
3.  **Phase 3: Delivery & Location:** Integrate Mapbox for branch display, delivery zone validation, address collection, and potentially fee calculation. Implement Take-out time selection.
4.  **Phase 4: Tracking & Notifications:** Implement real-time order tracking UI, integrate Brevo for core notifications (confirmation, status updates).
5.  **Phase 5: Admin Panel & Enhancements:** Build out the Admin features (Menu/Branch/Order Management). Implement Onboarding, User Profile enhancements, Promotions, Feedback, etc.
