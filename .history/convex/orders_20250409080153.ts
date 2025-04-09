import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel"; // Import Id
import { ensureAdmin } from "./lib/auth"; // Import the helper

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
  },
  handler: async (ctx, { orderId, status }) => {
    await ensureAdmin(ctx); // <-- Add auth check (Ensure only admins can update)
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(orderId, { status });
    try {
        await ctx.scheduler.runAfter(0, api.brevo.sendOrderStatusUpdateEmail, { orderId });
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
    if (args.orderType === 'Dine-In' && (!args.dineInDateTime || !args.dineInGuests || !args.dineInReservationType)) {
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
        await ctx.scheduler.runAfter(0, api.brevo.sendOrderStatusUpdateEmail, { orderId: newOrderId }); 
        console.log(`[CONVEX M(orders:createOrder)] Scheduled confirmation email for order ${newOrderId}.`);
    } catch (error) {
        console.error(`[CONVEX M(orders:createOrder)] Failed to schedule confirmation email for order ${newOrderId}:`, error);
        // Continue even if email scheduling fails
    }

    console.log(`[CONVEX M(orders:createOrder)] Order creation process complete for ID: ${newOrderId}`);
    return newOrderId;
  },
});

// Removed: getTicketDetailsForValidation (replaced by getOrderDetailsForTracking)
// Removed: getUserTicketForEvent (replaced by getUserOrders)
// Removed: generateTicketValidationUrl (commented out)
// Removed related imports/constants if any

// Query for Admin view - Fetch orders with basic related info
export const getOrdersAdmin = query({
  args: {
    // Add filter arguments later if needed
    // branchId: v.optional(v.id("branches")),
    // status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx); // <-- Add auth check
    let ordersQuery = ctx.db.query("orders").order("desc");

    // TODO: Apply filters based on args if added later
    // Example filter:
    // if (args.branchId) {
    //    ordersQuery = ordersQuery.withIndex("by_branch_status", q => q.eq("branchId", args.branchId));
    // } 
    // if (args.status) { ... filter by status ... }

    const orders = await ordersQuery.collect();

    // Enrich with Branch Name and User Email for display
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const branch = await ctx.db.get(order.branchId);
        const user = await ctx.db.query("users").withIndex("by_user_id", q => q.eq("userId", order.userId)).first();
        return {
          ...order,
          branchName: branch?.name ?? "Unknown Branch",
          userEmail: user?.email ?? "Unknown User",
        };
      })
    );

    return ordersWithDetails;
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
            await ctx.scheduler.runAfter(0, api.brevo.sendOrderStatusUpdateEmail, { orderId });
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
