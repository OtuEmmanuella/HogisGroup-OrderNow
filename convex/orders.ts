import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel"; // Import Id
import { ensureAdmin, getUserFromAuth } from "./lib/auth"; // Import the helper

// Fetch all orders for a specific user
export const getUserOrders = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc") // Show newest orders first
      .collect();

    // Optionally enrich orders with branch/item details here if needed frequently
    // Or keep it lightweight and fetch details on demand
    return orders;
  },
});

// Fetch a single order with details about the branch and items
export const getOrderWithDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const branch = await ctx.db.get(order.branchId);

    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return {
          ...item,
          // Include necessary item details like name
          name: menuItem?.name ?? "Unknown Item",
          // description: menuItem?.description,
          // imageStorageId: menuItem?.imageStorageId,
        };
      })
    );

    return {
      ...order,
      branch: branch ? { _id: branch._id, name: branch.name, address: branch.address } : null,
      items: itemsWithDetails,
    };
  },
});

// Removed getValidTicketsForEvent

// Internal mutation for webhook to update status without admin check
export const internalUpdateOrderStatusFromWebhook = internalMutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("Pending Confirmation"),
      v.literal("Received"),
      v.literal("Preparing"),
      v.literal("Ready for Pickup"),
      v.literal("Out for Delivery"),
      v.literal("Completed"),
      v.literal("Cancelled")
    ),
    paymentReference: v.optional(v.string()), // Add optional paymentReference
  },
  handler: async (ctx, { orderId, status, paymentReference }) => { // Destructure paymentReference
    console.log(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Received args: orderId=${orderId}, status=${status}, paymentReference=${paymentReference}`);

    let order;
    try {
      order = await ctx.db.get(orderId);
    } catch (getError) {
      console.error(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Error fetching order ${orderId}:`, getError);
      throw new Error(`Failed to fetch order: ${getError instanceof Error ? getError.message : String(getError)}`);
    }

    if (!order) {
      console.error(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Order not found: ${orderId}`);
      throw new Error("Order not found");
    }
    console.log(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Found order: ${orderId}`);

    // Prepare the patch object
    const patchData: { status: typeof status, paymentReference?: string } = { status };
    if (paymentReference !== undefined) {
      patchData.paymentReference = paymentReference;
    }

    try {
      await ctx.db.patch(orderId, patchData);
      console.log(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Order ${orderId} status updated to ${status}${paymentReference ? ` with payment ref ${paymentReference}` : ''} by webhook.`);
    } catch (patchError) {
      console.error(`[CONVEX internalM(orders:internalUpdateOrderStatusFromWebhook)] Error patching order ${orderId} with data ${JSON.stringify(patchData)}:`, patchError);
      throw new Error(`Failed to patch order: ${patchError instanceof Error ? patchError.message : String(patchError)}`);
    }
    // Optionally trigger other internal actions like notifications here
  },
});

// Update the status of an existing order
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    // Use the new status literals defined in the schema
    status: v.union(
      v.literal("Pending Confirmation"),
      v.literal("Received"),
      v.literal("Preparing"),
      v.literal("Ready for Pickup"),
      v.literal("Out for Delivery"),
      v.literal("Completed"),
      v.literal("Cancelled")
    ),
    paymentReference: v.optional(v.string()), // Add optional paymentReference
  },
  handler: async (ctx, { orderId, status, paymentReference }) => { // Destructure paymentReference
    await ensureAdmin(ctx); // <-- Add auth check (Ensure only admins can update)
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(orderId, { status });
    try {
    } catch (error) {
        console.error(`Failed to schedule status update email for order ${orderId}:`, error);
    }
  },
});

// Fetch detailed order information, e.g., for an order tracking page
export const getOrderDetailsForTracking = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    console.log(`[CONVEX Q(orders:getOrderDetailsForTracking)] Fetching details for order: ${args.orderId}`);
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      console.log(`[CONVEX Q(orders:getOrderDetailsForTracking)] Order not found: ${args.orderId}`);
      return null;
    }

    const branch = await ctx.db.get(order.branchId);
    if (!branch) {
        console.error(`[CONVEX Q(orders:getOrderDetailsForTracking)] Branch ${order.branchId} not found for order ${args.orderId}`);
        return null; // Or partial data
    }

    const user = await ctx.db.query("users")
                           .withIndex("by_user_id", q => q.eq("userId", order.userId))
                           .first();
     if (!user) {
        console.error(`[CONVEX Q(orders:getOrderDetailsForTracking)] User ${order.userId} not found for order ${args.orderId}`);
        return null; // Or partial data
    }

    // Fetch details for each item in the order
    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return {
          ...item,
          name: menuItem?.name ?? "Unknown Item",
          description: menuItem?.description,
          // Add other relevant item details
        };
      })
    );

    console.log(`[CONVEX Q(orders:getOrderDetailsForTracking)] Found order, branch, user, and items for: ${args.orderId}`);
    return {
      order: {
          _id: order._id,
          status: order.status,
          createdAt: order._creationTime,
          totalAmount: order.totalAmount,
          orderType: order.orderType,
          // Include other relevant order fields like deliveryAddress, pickupTime conditionally
      },
      branch: {
          _id: branch._id,
          name: branch.name,
          address: branch.address,
          // Add other relevant branch fields like operating hours
      },
      user: {
          _id: user._id,
          name: user.name,
          email: user.email,
      },
      items: itemsWithDetails,
    };
  },
});

// New mutation to create an order
export const createOrder = mutation({
  args: {
    branchId: v.id("branches"),
    userId: v.string(),
    customerName: v.optional(v.string()),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        quantity: v.number(),
      })
    ),
    orderType: v.union(
      v.literal("Delivery"),
      v.literal("Dine-In"),
      v.literal("Take-out")
    ),
    // Update deliveryAddress structure
    deliveryAddress: v.optional(v.object({ 
        street: v.string(),
        customerPhone: v.string(),
        recipientPhone: v.optional(v.string()),
        recipientName: v.optional(v.string()),
    })),
    pickupTime: v.optional(v.number()), // Timestamp
    dineInDateTime: v.optional(v.number()),
    dineInGuests: v.optional(v.number()),
    dineInReservationType: v.optional(v.string()),
    appliedPromoId: v.optional(v.id("promotions")),
  },
  handler: async (ctx, args) => {
    console.log("[CONVEX M(orders:createOrder)] Received order creation request:", args);
    // TODO: Authentication check (ensure userId matches authenticated user)
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity || identity.subject !== args.userId) {
    //    throw new Error("User not authenticated or mismatch.");
    // }

    // Ensure customer name is provided (making it effectively required here, though schema is optional)
    if (!args.customerName) {
      throw new Error("Customer name is required.");
    }

    // --- Validate Branch --- 
    const branch = await ctx.db.get(args.branchId);
    if (!branch) {
      console.error(`[CONVEX M(orders:createOrder)] Branch not found: ${args.branchId}`);
      throw new Error("Branch not found");
    }
    console.log(`[CONVEX M(orders:createOrder)] Branch ${branch.name} found.`);

    // --- Validate Items & Calculate Total --- 
    let calculatedTotal = 0;
    const itemsWithPrice = await Promise.all(args.items.map(async (item) => {
      if (item.quantity <= 0) {
          throw new Error(`Invalid quantity (${item.quantity}) for item.`);
      }
      const menuItem = await ctx.db.get(item.menuItemId);
      if (!menuItem) {
        console.error(`[CONVEX M(orders:createOrder)] Menu item not found: ${item.menuItemId}`);
        throw new Error(`Menu item with ID ${item.menuItemId} not found.`);
      }
      // *** ITEM AVAILABILITY CHECK ***
      if (!menuItem.isAvailable) {
          console.warn(`[CONVEX M(orders:createOrder)] Menu item unavailable: ${menuItem.name} (${item.menuItemId})`);
          throw new Error(`Sorry, ${menuItem.name} is currently unavailable.`);
      }
      // *** END CHECK ***
      
      // Optional: Check if menuItem.branchId matches args.branchId if that logic is added later
      
      const unitPrice = menuItem.price;
      calculatedTotal += unitPrice * item.quantity;
       console.log(`[CONVEX M(orders:createOrder)] Item validated: ${menuItem.name} (${item.menuItemId}), Price: ${unitPrice}, Qty: ${item.quantity}`);
      return { ...item, unitPrice, name: menuItem.name }; // Include name for logging/potential use
    }));
    console.log(`[CONVEX M(orders:createOrder)] Calculated total (before promo): ${calculatedTotal}`);

    // --- Apply Promo Discount (Server-Side) ---
    let finalAmount = calculatedTotal;
    let promoDetails: { promoId: Id<"promotions">, calculatedDiscount: number } | null = null;
    if (args.appliedPromoId) {
        const promo = await ctx.db.get(args.appliedPromoId);
        if (promo && promo.isActive && (!promo.endDate || promo.endDate >= Date.now()) && (!promo.usageLimit || promo.usageCount < promo.usageLimit)) {
            let discount = 0;
            if (promo.discountType === "percentage") {
                discount = Math.round(calculatedTotal * (promo.discountValue / 100));
            } else if (promo.discountType === "fixed") {
                discount = Math.min(promo.discountValue, calculatedTotal);
            }
            discount = Math.max(0, discount);
            finalAmount = Math.max(0, calculatedTotal - discount);
            promoDetails = { promoId: args.appliedPromoId, calculatedDiscount: discount };
            console.log(`[CONVEX M(orders:createOrder)] Applying promo ${promo.code}. Original: ${calculatedTotal}, Discount: ${discount}, Final: ${finalAmount}`);
        } else {
            console.warn(`[CONVEX M(orders:createOrder)] Applied promo ID ${args.appliedPromoId} is invalid or expired. Not applying discount.`);
            args.appliedPromoId = undefined; 
        }
    }
    console.log(`[CONVEX M(orders:createOrder)] Final amount (after promo): ${finalAmount}`);

    // --- Validate Conditional Fields --- (Moved after calculations in case promo affects minimums later)
    if (args.orderType === 'Delivery' && !args.deliveryAddress) {
        throw new Error("Delivery address is required for delivery orders.");
    }
    if (args.orderType === 'Take-out' && !args.pickupTime) {
         console.warn("[CONVEX M(orders:createOrder)] Take-out order created without pickup time.");
        // throw new Error("Pickup time is required for take-out orders.");
    }
    if (args.orderType === 'Dine-In' && (!args.dineInDateTime || args.dineInGuests || !args.dineInReservationType)) {
         console.warn("[CONVEX M(orders:createOrder)] Dine-In order created without required details (Date/Time, Guests, Type).");
         // Depending on strictness, could throw Error here
         // throw new Error("Date/Time, number of guests, and reservation type are required for Dine-In orders.");
    }
    
    // --- Insert Order into Database --- 
    const newOrderId = await ctx.db.insert("orders", {
      branchId: args.branchId,
      userId: args.userId,
      customerName: args.customerName,
      items: itemsWithPrice.map(({ menuItemId, quantity, unitPrice }) => ({ menuItemId, quantity, unitPrice })), 
      orderType: args.orderType,
      status: "Pending Confirmation", // Initial status
      totalAmount: finalAmount, // Use final calculated amount
      paymentStatus: "Pending", // Initial payment status
      createdAt: Date.now(), // Timestamp for creation
      // Conditionally include delivery details
      ...(args.orderType === 'Delivery' && {
        deliveryAddress: args.deliveryAddress!, // Assert non-null as validated earlier
      }),
      // Conditionally include other details
      ...(args.orderType === 'Take-out' && { pickupTime: args.pickupTime }),
      // Add Dine-In details conditionally
      ...(args.orderType === 'Dine-In' && { 
          dineInDateTime: args.dineInDateTime,
          dineInGuests: args.dineInGuests,
          dineInReservationType: args.dineInReservationType
      }),
      // Store promo details if applied
      ...(promoDetails && { appliedPromoId: promoDetails.promoId, discountAmount: promoDetails.calculatedDiscount }),
    });
    console.log(`[CONVEX M(orders:createOrder)] Order ${newOrderId} successfully inserted.`);

    // --- Increment Promo Usage Count (if applicable) --- (Keep existing logic)
    if (promoDetails) {
        try {
            const promo = await ctx.db.get(promoDetails.promoId);
            if (promo) {
                const currentCount = promo.usageCount || 0;
                await ctx.db.patch(promoDetails.promoId, { usageCount: currentCount + 1 }); 
                console.log(`[CONVEX M(orders:createOrder)] Incremented usage count for promo ${promoDetails.promoId} from ${currentCount} to ${currentCount + 1}`);
            } else {
                 console.error(`[CONVEX M(orders:createOrder)] Failed to increment usage count: Promo ${promoDetails.promoId} not found.`);
            }
        } catch (error) {
             console.error(`[CONVEX M(orders:createOrder)] Error incrementing usage count for promo ${promoDetails.promoId}:`, error);
             // Decide if the order should still proceed or fail if increment fails
        }
    }

    // --- Schedule notification --- 
    try {
        console.log(`[CONVEX M(orders:createOrder)] Scheduled confirmation email for order ${newOrderId}.`);
    } catch (error) {
        console.error(`[CONVEX M(orders:createOrder)] Failed to schedule confirmation email for order ${newOrderId}:`, error);
        // Continue even if email scheduling fails
    }

    console.log(`[CONVEX M(orders:createOrder)] Order creation process complete for ID: ${newOrderId}`);
    await ctx.scheduler.runAfter(0, api.actions.updateUserActivity, { userId: args.userId });
    return newOrderId;
  },
});

// Removed: getTicketDetailsForValidation (replaced by getOrderDetailsForTracking)
// Removed: getUserTicketForEvent (replaced by getUserOrders)
// Removed: generateTicketValidationUrl (commented out)
// Removed related imports/constants if any

// Query for Admin view - Fetch orders with basic related info
export const getOrdersAdmin = query({
  args: {},
  handler: async (ctx, args) => {
    await ensureAdmin(ctx); // <-- Add auth check

    // Fetch regular orders
    const orders = await ctx.db.query("orders").order("desc").collect();

    // Fetch shared carts (treating them as "orders" for the admin view)
    const sharedCarts = await ctx.db.query("sharedCarts").order("desc").collect();

    // Combine and enrich both types of orders
    const allOrders = await Promise.all([
      ...orders.map(async (order) => {
        const branch = await ctx.db.get(order.branchId);
        const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("userId", order.userId)).first();
        return {
          ...order,
          _type: "order", // Add a type to distinguish between regular orders and shared carts
          branchName: branch?.name ?? "Unknown Branch",
          userEmail: user?.email ?? "Unknown User",
        };
      }),
      ...sharedCarts.map(async (cart) => {
        // For shared carts, we'll use the initiator's info as the "user"
        const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("userId", cart.initiatorId)).first();
        const branch = cart.branchId ? await ctx.db.get(cart.branchId) : null;
        return {
          ...cart,
          _type: "sharedCart", // Add a type to distinguish between regular orders and shared carts
          branchName: branch?.name ?? "Unknown Branch",
          userEmail: user?.email ?? "Unknown User",
          totalAmount: cart.totalAmount, // Ensure totalAmount is included
        };
      }),
    ]);

    // Sort all orders by creation time (descending)
    allOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return allOrders;
  },
});

// Mutation to add Paystack reference to an order AFTER initialization
export const addPaystackReference = mutation({
    args: {
        orderId: v.id("orders"),
        paystackReference: v.string(),
    },
    handler: async (ctx, { orderId, paystackReference }) => {
        // TODO: Consider adding authentication check here? 
        // Should this only be callable internally or by the user who owns the order?
        // For now, assuming it's called server-side by our initialize action.
        
        const order = await ctx.db.get(orderId);
        if (!order) {
            throw new Error("Order not found");
        }
        
        // Optional: Check if reference already exists?
        if (order.paystackReference) {
            console.warn(`Order ${orderId} already has a Paystack reference (${order.paystackReference}). Overwriting with ${paystackReference}.`);
        }
        
        await ctx.db.patch(orderId, { paystackReference: paystackReference });
        console.log(`Successfully added Paystack reference ${paystackReference} to order ${orderId}`);
    }
});

// Internal mutation to update order status (e.g., from webhook)
export const updateOrderStatusInternal = internalMutation({
    args: {
        orderId: v.id("orders"),
        status: v.union(
            v.literal("Pending Confirmation"),
            v.literal("Received"),
            v.literal("Preparing"),
            v.literal("Ready for Pickup"),
            v.literal("Out for Delivery"),
            v.literal("Completed"),
            v.literal("Cancelled")
        ),
    },
    handler: async (ctx, { orderId, status }) => {
        console.log(`[CONVEX IM(orders:updateOrderStatusInternal)] Updating order ${orderId} status to: ${status}`);
        const order = await ctx.db.get(orderId);
        if (!order) {
            console.error(`[CONVEX IM(orders:updateOrderStatusInternal)] Order not found: ${orderId}`);
            return; // Or throw
        }
        await ctx.db.patch(orderId, { status });
        console.log(`[CONVEX IM(orders:updateOrderStatusInternal)] Order ${orderId} status updated successfully.`);

        // Schedule email notification if status changed
        try {
            console.log(`[CONVEX IM(orders:updateOrderStatusInternal)] Scheduled status update email for ${orderId}`);
        } catch (error) {
            console.error(`[CONVEX IM(orders:updateOrderStatusInternal)] Failed to schedule email for order ${orderId}:`, error);
        }
    }
});

// Internal query to find an order by its Paystack reference (for webhook)
export const getOrderByPaystackReference = internalQuery({
    args: { paystackReference: v.string() },
    handler: async (ctx, { paystackReference }) => {
        console.log(`[CONVEX IQ(orders:getOrderByPaystackReference)] Searching for order with ref: ${paystackReference}`);
        const order = await ctx.db
            .query("orders")
            .withIndex("by_paystack_reference", (q) => q.eq("paystackReference", paystackReference))
            .first();
        if (order) {
            console.log(`[CONVEX IQ(orders:getOrderByPaystackReference)] Found order ${order._id} for ref ${paystackReference}`);
        } else {
            console.log(`[CONVEX IQ(orders:getOrderByPaystackReference)] No order found for ref ${paystackReference}`);
        }
        return order;
    }
});

// ... getAllOrdersAdmin query ...

// ... getBranchSalesAnalytics query ...

/**
 * Reorders items from a past order.
 * Fetches items from the specified order, checks current availability and price,
 * and returns a list of items that can be added to a new cart.
 * Requires authenticated user to own the original order.
 */
export const reorderItems = mutation({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const user = await getUserFromAuth(ctx);
        if (!user) {
            throw new Error("Authentication required to reorder items.");
        }

        // 1. Fetch the original order
        const originalOrder = await ctx.db.get(args.orderId);
        if (!originalOrder) {
            throw new Error("Original order not found.");
        }

        // 2. Verify user ownership
        if (originalOrder.userId !== user.userId) {
            throw new Error("You can only reorder your own past orders.");
        }

        // 3. Process items: Check current availability and price
        const itemsToAdd = [];
        const unavailableItems: string[] = [];

        for (const item of originalOrder.items) {
            const menuItem = await ctx.db.get(item.menuItemId);

            if (menuItem && menuItem.isAvailable) {
                itemsToAdd.push({
                    _id: menuItem._id, // Use the actual menuItem ID
                    name: menuItem.name,
                    price: menuItem.price, // Use the CURRENT price
                    quantity: item.quantity, // Use the original quantity
                });
            } else {
                unavailableItems.push(item.name ?? `Item ID: ${item.menuItemId}`);
            }
        }

        if (itemsToAdd.length === 0) {
            return {
                success: false,
                message: "None of the items from the original order are currently available.",
                items: [],
                unavailableItems: unavailableItems,
            };
        }

        let message = "Items ready to be added to cart.";
        if (unavailableItems.length > 0) {
            message = `Some items were unavailable: ${unavailableItems.join(", ")}. Available items ready.`;
        }

        return {
            success: true,
            message: message,
            items: itemsToAdd, // Return items with current price and original quantity
            unavailableItems: unavailableItems,
        };
    },
});

/**
 * Fetches detailed data needed to generate an invoice for a specific order.
 * Requires the user to be authenticated and either own the order or be an admin.
 */
export const getInvoiceData = query({
    args: { orderId: v.id("orders") },
    handler: async (ctx, args) => {
        const user = await getUserFromAuth(ctx); // Check authentication first
        if (!user) {
            throw new Error("Authentication required to view invoice.");
        }

        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found.");
        }

        // Authorization check: User must own the order OR be an admin
        if (order.userId !== user.userId && user.role !== "admin") {
            throw new Error("Not authorized to view this invoice.");
        }

        // Fetch related data
        const branch = await ctx.db.get(order.branchId);
        const orderUser = await ctx.db.query("users")
                                   .withIndex("by_user_id", q => q.eq("userId", order.userId))
                                   .unique();

        // Fetch item details (similar to getOrderWithDetails, maybe refactor later)
        const itemsWithDetails = await Promise.all(
            order.items.map(async (item) => {
                const menuItem = await ctx.db.get(item.menuItemId);
                return {
                    _id: item.menuItemId,
                    name: menuItem?.name ?? "Unknown Item",
                    quantity: item.quantity,
                    unitPrice: item.unitPrice, // Price at time of order
                    totalPrice: item.unitPrice * item.quantity,
                };
            })
        );

        return {
            _id: order._id,
            _creationTime: order._creationTime,
            status: order.status,
            orderType: order.orderType,
            totalAmount: order.totalAmount,
            discountAmount: order.discountAmount,
            // Add taxAmount if available in your schema
            // taxAmount: order.taxAmount,
            subTotal: order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), // Calculate subtotal before discounts/taxes
            items: itemsWithDetails,
            branch: branch ? {
                name: branch.name,
                address: branch.address,
                contactNumber: branch.contactNumber,
            } : null,
            user: orderUser ? {
                name: orderUser.name ?? order.customerName ?? "N/A",
                email: orderUser.email,
                address: orderUser.address, // Include the address object
            } : null,
            deliveryAddress: order.deliveryAddress,
            notes: order.notes,
        };
    },
});
