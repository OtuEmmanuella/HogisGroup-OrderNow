import { v } from "convex/values";
import { nanoid } from "nanoid"; // For generating unique invite codes
import {
  query,
  mutation,
  internalMutation,
  DatabaseReader,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getUserFromAuth } from "./lib/getUserFromAuth"; // Helper to get Clerk user
import { api, internal } from "./_generated/api"; // Import the generated API object

// --- Helper Functions ---

// (Potential helper to calculate total amount - can be refined)
async function calculateCartTotal(db: DatabaseReader, cartId: Id<"sharedCarts">): Promise<number> {
  const items = await db
    .query("sharedCartItems")
    .withIndex("by_cart", (q) => q.eq("cartId", cartId))
    .collect();
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

// --- Mutations ---

/**
 * Creates a new shared cart.
 * Requires authenticated user (Clerk).
 */
export const createSharedCart = mutation({
  args: {
    branchId: v.id("branches"),
    paymentMode: v.union(v.literal("split"), v.literal("payAll")),
    orderType: v.union(
      v.literal("Delivery"),
      v.literal("Dine-In"),
      v.literal("Take-out")
    ),
    deliveryZoneId: v.optional(v.id("deliveryZones")), // Added for delivery orders
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to create a shared cart.");
    }

    // Delivery zone and fee will be handled later during checkout
    // Remove the immediate validation and fee calculation for delivery orders
    /*
    let deliveryFee = 0;
    let deliveryZone: Doc<"deliveryZones"> | null = null;
    if (args.orderType === 'Delivery') {
      if (!args.deliveryZoneId) {
        throw new Error("Delivery zone ID is required for delivery shared carts.");
      }
      deliveryZone = await ctx.db.get(args.deliveryZoneId);
      if (!deliveryZone || !deliveryZone.isActive) {
        throw new Error("Selected delivery zone is not valid or inactive.");
      }
      const now = new Date(); 
      const currentHour = now.getHours();
      const peakStartHour = 18;
      const peakEndHour = 21;
      const isPeak = currentHour >= peakStartHour && currentHour < peakEndHour;
      deliveryFee = isPeak ? deliveryZone.peakFee : deliveryZone.baseFee;
      console.log(`[CONVEX M(sharedCarts:create)] Delivery setup removed for now.`);
    }
    */

    const inviteCode = nanoid(8); // Generate a short, unique invite code

    const cartId = await ctx.db.insert("sharedCarts", {
      initiatorId: user.userId,
      branchId: args.branchId,
      status: "open",
      paymentMode: args.paymentMode,
      orderType: args.orderType,
      inviteCode: inviteCode,
      totalAmount: 0, // Initial item total
      createdAt: Date.now(),
      // deliveryZoneId and deliveryFee will be added later via a separate mutation
      // ...(args.orderType === 'Delivery' && {
      //   deliveryZoneId: args.deliveryZoneId!, // Assert non-null due to check above
      //   deliveryFee: deliveryFee, // Store the calculated fee
      // }),
    });

    // Automatically add the initiator as the first member
    await ctx.db.insert("sharedCartMembers", {
      cartId: cartId,
      userId: user.userId,
      paymentStatus: "pending",
      amountDue: 0, // Will be calculated later for split
    });

    return { cartId, inviteCode };
  },
});

/**
 * Allows an authenticated user to join an existing shared cart using an invite code.
 */
export const joinSharedCart = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to join a shared cart.");
    }

    const cart = await ctx.db
      .query("sharedCarts")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!cart) {
      throw new Error("Invalid invite code.");
    }

    if (cart.status !== "open") {
      throw new Error("This cart is no longer open for joining.");
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) =>
        q.eq("cartId", cart._id).eq("userId", user.userId)
      )
      .first();

    if (existingMember) {
      // User is already in the cart, maybe just return the cartId
      return { cartId: cart._id, alreadyMember: true };
    }

    // Add the user as a new member
    await ctx.db.insert("sharedCartMembers", {
      cartId: cart._id,
      userId: user.userId,
      paymentStatus: "pending",
      amountDue: 0,
    });

    return { cartId: cart._id, alreadyMember: false };
  },
});

/**
 * Adds an item to a shared cart. Only members can add items.
 */
export const addSharedCartItem = mutation({
  args: {
    cartId: v.id("sharedCarts"),
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    // Note: unitPrice should ideally be fetched server-side to prevent tampering
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to add items to a shared cart.");
    }

    // Verify user is a member of the cart
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) =>
        q.eq("cartId", args.cartId).eq("userId", user.userId)
      )
      .first();

    if (!member) {
      throw new Error("You are not a member of this cart.");
    }

    const cart = await ctx.db.get(args.cartId);
    if (!cart || cart.status !== "open") {
        throw new Error("Cart is not open or does not exist.");
    }

    // Fetch the menu item server-side to get the correct price
    const menuItem = await ctx.db.get(args.menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      throw new Error("Menu item is not available or does not exist.");
    }
    const unitPrice = menuItem.price; // Use server-side price

    // Add the item
    await ctx.db.insert("sharedCartItems", {
      cartId: args.cartId,
      userId: user.userId, // Track who added the item
      menuItemId: args.menuItemId,
      quantity: args.quantity,
      unitPrice: unitPrice,
    });

    // Update the total amount on the cart (can be moved to an internal mutation for consistency)
    const newTotal = await calculateCartTotal(ctx.db, args.cartId);
    await ctx.db.patch(args.cartId, { totalAmount: newTotal });

    // Consider scheduling an internal mutation for total calculation if complex
    // await ctx.scheduler.runAfter(0, internal.sharedCarts.updateCartTotal, { cartId: args.cartId });

    return { success: true };
  },
});

/**
 * Updates an item's quantity or removes it from a shared cart.
 * Only the user who added the item can modify it.
 * A negative quantity indicates a decrement.
 */
export const removeSharedCartItem = mutation({
  args: {
    cartItemId: v.id("sharedCartItems"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required.");
    }

    const itemToRemove = await ctx.db.get(args.cartItemId);
    if (!itemToRemove) {
      // Even if item is not found, we can consider this a success to avoid user-facing errors on double-clicks
      console.warn(`removeSharedCartItem: Item with ID ${args.cartItemId} not found.`);
      return { success: true }; 
    }

    const cart = await ctx.db.get(itemToRemove.cartId);
    if (!cart) {
      throw new Error("Cart not found for the item.");
    }

    if (cart.status !== "open") {
      throw new Error("Cannot remove items from a cart that is not open.");
    }

    // Check permissions: user must be the one who added the item OR the cart initiator
    if (itemToRemove.userId !== user.userId && cart.initiatorId !== user.userId) {
      throw new Error("You do not have permission to remove this item.");
    }

    // Delete the item
    await ctx.db.delete(args.cartItemId);

    // Recalculate and update the cart total
    const newTotal = await calculateCartTotal(ctx.db, cart._id);
    await ctx.db.patch(cart._id, { totalAmount: newTotal });

    return { success: true };
  },
});


export const updateSharedCartItem = mutation({
  args: {
    cartId: v.id("sharedCarts"),
    menuItemId: v.id("menuItems"),
    quantity: v.number(), // Can be positive (increment) or negative (decrement)
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required.");
    }

    const cart = await ctx.db.get(args.cartId);
    if (!cart || cart.status !== "open") {
      throw new Error("Cart is not open or does not exist.");
    }

    const existingItem = await ctx.db
      .query("sharedCartItems")
      .withIndex("by_cart_user_item", (q) =>
        q.eq("cartId", args.cartId)
         .eq("userId", user.userId)
         .eq("menuItemId", args.menuItemId)
      )
      .first();

    if (!existingItem) {
      throw new Error("Item not found in cart.");
    }

    const newQuantity = existingItem.quantity + args.quantity;

    if (newQuantity > 0) {
      await ctx.db.patch(existingItem._id, { quantity: newQuantity });
    } else {
      await ctx.db.delete(existingItem._id);
    }

    const newTotal = await calculateCartTotal(ctx.db, args.cartId);
    await ctx.db.patch(args.cartId, { totalAmount: newTotal });

    return { success: true };
  },
});

/**
 * Sets the payment mode for a shared cart.
 * Only the cart initiator can change the mode.
 * Cart must be in 'open' status.
 */
export const setPaymentMode = mutation({
  args: {
    cartId: v.id("sharedCarts"),
    paymentMode: v.union(v.literal("split"), v.literal("payAll")),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to set payment mode.");
    }

    // Fetch the cart
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found.");
    }

    // Check permissions: Only the initiator can change the mode
    if (cart.initiatorId !== user.userId) {
      throw new Error("Permission denied: Only the cart initiator can set the payment mode.");
    }

    // Check if cart is still open
    if (cart.status !== "open") {
      throw new Error("Cannot change payment mode for a cart that is not open.");
    }

    // Update the payment mode
    await ctx.db.patch(args.cartId, { paymentMode: args.paymentMode });

    return { success: true };
  },
});

// --- Internal Mutations ---

/**
 * INTERNAL: Updates the payment status for a specific member in a shared cart.
 * Called by the Paystack webhook action after successful payment verification.
 */
export const internalUpdateSharedCartPaymentStatus = internalMutation({
  args: {
    cartId: v.id("sharedCarts"),
    userId: v.string(),
    paymentReference: v.string(),
    amountPaid: v.number(),
  },
  handler: async (ctx, { cartId, userId, paymentReference, amountPaid }) => {
    console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Updating payment for user ${userId} in cart ${cartId}`);

    // 1. Find the specific member entry
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) => q.eq("cartId", cartId).eq("userId", userId))
      .first();

    if (!member) {
      console.error(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Member ${userId} not found in cart ${cartId}`);
      throw new Error(`Member ${userId} not found in cart ${cartId}`);
    }

    // 2. Update the member's payment status and store payment details
    await ctx.db.patch(member._id, {
      paymentStatus: "paid",
      paymentReference: paymentReference,
      amountPaid: amountPaid,
    });

    console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Payment status updated to 'paid' for user ${userId} in cart ${cartId}`);

    // 3. Get the cart to check payment mode and current status
    const cart = await ctx.db.get(cartId);
    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    // 4. Handle completion based on payment mode
    if (cart.paymentMode === "split") {
      // For split payment: check if all members have paid
      const allMembers = await ctx.db
        .query("sharedCartMembers")
        .withIndex("by_cart", (q) => q.eq("cartId", cartId))
        .collect();

      const allPaid = allMembers.every((m) => m.paymentStatus === "paid");
      
      if (allPaid) {
        console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] All members have paid in split cart ${cartId}. Marking as completed.`);
        await ctx.db.patch(cartId, { status: "completed" });
      }
    } else if (cart.paymentMode === "payAll") {
      // For pay-all: the cart is completed when the initiator pays
      if (userId === cart.initiatorId) {
        console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Initiator has paid for cart ${cartId}. Marking as completed.`);
        await ctx.db.patch(cartId, { status: "completed" });
        
        // Also mark all members as paid since initiator covered everything
        const allMembers = await ctx.db
          .query("sharedCartMembers")
          .withIndex("by_cart", (q) => q.eq("cartId", cartId))
          .collect();
          
        for (const m of allMembers) {
          if (m.userId !== userId) { // Skip the initiator who already has a real payment record
            await ctx.db.patch(m._id, {
              paymentStatus: "paid",
              paymentReference: `covered_by_${paymentReference}`,
              amountPaid: 0 // They didn't actually pay anything
            });
          }
        }
      }
    }

    return { success: true };
  },
});


// --- Queries ---

/**
 * Gets details of a specific shared cart, including members and items.
 * Requires authenticated user who is a member of the cart.
 */
export const getSharedCart = query({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    try {
      let user;
      try {
        user = await getUserFromAuth(ctx); // Attempt to get user
      } catch (error) {
        console.warn("getSharedCart: User not authenticated yet or error fetching identity.", error);
        return null; // User not authenticated or error fetching identity
      }

      // Verify user is a member
      const member = await ctx.db
        .query("sharedCartMembers")
        .withIndex("by_cart_user", (q) =>
          q.eq("cartId", args.cartId).eq("userId", user!.userId)
        )
        .first();

      if (!member) {
        console.warn(`getSharedCart: User ${user!.userId} is not a member of cart ${args.cartId}.`);
        return null;
      }

      // Fetch cart details
      const cart = await ctx.db.get(args.cartId);
      if (!cart) {
        return null;
      }

      // Fetch members
      const members = await ctx.db
        .query("sharedCartMembers")
        .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
        .collect();

      // Fetch items
      const items = await ctx.db
        .query("sharedCartItems")
        .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
        .collect();

      // Enrich items with menu item details
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          let menuItem = null;
          let name = "Unknown Item";
          let imageUrl = undefined;
          try {
            menuItem = await ctx.db.get(item.menuItemId);
            if (menuItem) {
              name = menuItem.name ?? name;
              imageUrl = menuItem.imageUrl;
            }
          } catch (error) {
            console.error(`Error fetching menu item ${item.menuItemId} for cart ${args.cartId}:`, error);
          }
          return {
            ...item,
            name,
            imageUrl,
          };
        })
      );

      // Enrich members with user details
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          let userProfile = null;
          let name = "Unknown User";
          let imageUrl = undefined;
          try {
            userProfile = await ctx.db
              .query("users")
              .withIndex("by_user_id", (q) => q.eq("userId", member.userId))
              .first();

            if (userProfile) {
              name = userProfile.name ?? name;
              imageUrl = userProfile.imageUrl;
            } else {
              console.warn(`No user profile found for member ${member.userId} in cart ${args.cartId}`);
            }
          } catch (error) {
            console.error(`Error fetching user profile for member ${member.userId} in cart ${args.cartId}:`, error);
          }
          return {
            ...member,
            name,
            imageUrl,
          };
        })
      );

      return {
        ...cart,
        members: membersWithDetails,
        items: itemsWithDetails,
      };
    } catch (err) {
      console.error("getSharedCart: Unexpected error", err);
      return null;
    }
  },
});

/**
 * Gets a list of shared carts that the current user is a member of.
 */
export const getUserSharedCarts = query({
  args: {}, // No arguments needed, uses user's identity
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);

    if (!user) {
      // If user is not authenticated, they have no shared carts.
      return [];
    }

    // Find all memberships for the current user
    const memberships = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_user", (q) => q.eq("userId", user!.userId)) // Safe to access user.userId
      .collect();

    // Extract the cart IDs
    const cartIds = memberships.map((m) => m.cartId);

    // Fetch the details for each cart
    // Note: `Promise.all` is efficient for fetching multiple documents by ID
    const carts = await Promise.all(
      cartIds.map((cartId) => ctx.db.get(cartId))
    );

    // Filter out any null results (if a cart was deleted but membership remained)
    // and potentially filter by status (e.g., only show 'open' or 'paying' carts)
    const activeCarts = carts.filter(cart => cart !== null && (cart.status === 'open' || cart.status === 'paying' || cart.status === 'locked'));

    // TODO: Consider adding pagination or limiting results if the list can grow very large.
    // TODO: Consider enriching cart data with member count or item count if needed for display.

    return activeCarts;
  },
});

/**
 * Initiates the split payment process for a shared cart.
 * Only the cart initiator can start the payment.
 * Cart must be in 'open' status and 'split' payment mode.
 */
export const startSplitPayment = mutation({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to start payment.");
    }

    // Fetch user details to get email
    const userProfile = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", user.userId))
      .first();

    if (!userProfile || !userProfile.email) {
      throw new Error("User profile or email not found.");
    }

    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found.");
    }

    // Allow initiator OR member to initiate their own payment
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) =>
        q.eq("cartId", args.cartId).eq("userId", user.userId)
      )
      .first();

    if (!member) {
        throw new Error("You must be a member of this cart to pay your share.");
    }

    // Cart must be 'open' or 'paying' to initiate a payment
    if (cart.status !== "open" && cart.status !== "paying") {
      throw new Error("Cart must be open or in the paying process to initiate payment.");
    }

    if (cart.paymentMode !== "split") {
      throw new Error("Cart is not in split payment mode.");
    }

    // If cart is already 'paying', use existing amountDue, otherwise calculate
    let amountDueForThisMember: number;
    if (cart.status === "paying" && member.amountDue > 0) {
        amountDueForThisMember = member.amountDue;
        console.log(`Split payment resuming for cart ${args.cartId}. Amount due for member ${user.userId}: ${amountDueForThisMember}`);
    } else {
        // Calculate total and amount due per member if starting fresh
        const totalAmount = await calculateCartTotal(ctx.db, args.cartId);
        const allMembers = await ctx.db
          .query("sharedCartMembers")
          .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
          .collect();

        if (allMembers.length === 0) {
          throw new Error("Cannot start payment with no members in the cart.");
        }

        const amountDuePerMember = Math.ceil(totalAmount / allMembers.length); // Round up

        // Update cart status to 'paying' and member amounts if it was 'open'
        if (cart.status === "open") {
            await ctx.db.patch(args.cartId, { status: "paying", totalAmount });
            for (const m of allMembers) {
              await ctx.db.patch(m._id, { amountDue: amountDuePerMember });
            }
            console.log(`Split payment started for cart ${args.cartId}. Amount due per member: ${amountDuePerMember}`);
            amountDueForThisMember = amountDuePerMember;
        } else {
            // Should not happen if status is 'paying' and amountDue was 0, but handle defensively
            throw new Error("Cart is in 'paying' state but amount due calculation is needed unexpectedly.");
        }
    }

    // Generate a unique reference for this payment attempt
    const paymentReference = `sc_${args.cartId.substring(0, 4)}_${user.userId.substring(0, 4)}_${nanoid(6)}`;

    // Return data needed for Paystack initialization
    const paymentData = {
        amount: amountDueForThisMember, // Amount in kobo/cents
        email: userProfile.email,
        reference: paymentReference,
        metadata: {
            cartId: args.cartId,
            userId: user.userId,
            type: 'shared_cart_split',
            // Add any other relevant metadata
        },
    };

    return { success: true, paymentData }; // Return paymentData object
  },
});

/**
 * Initiates the 'Pay All' payment process for a shared cart.
 * Only the cart initiator can start this.
 * Cart must be in 'open' status and 'payAll' payment mode.
 */
export const startPayAll = mutation({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to start payment.");
    }

    // Fetch user details to get email
    const userProfile = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", user.userId))
      .first();

    if (!userProfile || !userProfile.email) {
      throw new Error("User profile or email not found.");
    }

    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found.");
    }

    if (cart.initiatorId !== user.userId) {
      throw new Error("Only the initiator can start the payment process.");
    }

    if (cart.status !== "open") {
      throw new Error("Cart must be open to start payment.");
    }

    if (cart.paymentMode !== "payAll") {
      throw new Error("Cart is not in pay-all mode.");
    }

    // Calculate final total
    const totalAmount = await calculateCartTotal(ctx.db, args.cartId);

    // Update cart status to 'locked' (prevents further changes)
    await ctx.db.patch(args.cartId, { status: "locked", totalAmount });

    console.log(`Pay-all process initiated for cart ${args.cartId}. Total: ${totalAmount}. Cart locked.`);

    // Generate a unique reference for this payment attempt
    const paymentReference = `sc_all_${args.cartId.substring(0, 4)}_${user.userId.substring(0, 4)}_${nanoid(6)}`;

    // Return data needed for Paystack initialization
    const paymentData = {
        amount: totalAmount, // Amount in kobo/cents
        email: userProfile.email,
        reference: paymentReference,
        metadata: {
            cartId: args.cartId,
            userId: user.userId, // Initiator is paying
            type: 'shared_cart_payall',
        },
    };

    // Return the payment data needed to initialize the transaction
    return { success: true, paymentData };
  },
});

/**
 * Cancels a shared cart.
 * Only the cart initiator can cancel.
 * Cart must be in 'open', 'paying', or 'locked' status.
 */
export const cancelSharedCart = mutation({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to cancel the cart.");
    }

    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      throw new Error("Cart not found.");
    }

    if (cart.initiatorId !== user.userId) {
      throw new Error("Only the initiator can cancel the cart.");
    }

    if (!["open", "paying", "locked"].includes(cart.status)) {
      throw new Error(`Cannot cancel a cart with status '${cart.status}'.`);
    }

    // Update cart status to 'cancelled'
    await ctx.db.patch(args.cartId, { status: "cancelled" });

    console.log(`Shared cart ${args.cartId} cancelled by initiator.`);
    // TODO: Consider if any cleanup of members or items is needed, though likely not necessary
    // TODO: Consider notifying members (e.g., via WebSocket or another mechanism)

    return { success: true };
  },
});

// --- Internal Mutations (Example for total calculation) ---
// export const updateCartTotal = internalMutation({
//   args: { cartId: v.id("sharedCarts") },
//   handler: async (ctx, args) => {
//     const newTotal = await calculateCartTotal(ctx.db, args.cartId);
//     await ctx.db.patch(args.cartId, { totalAmount: newTotal });
//   },
// });

/**
 * INTERNAL MUTATION: Expires old shared carts.
 * Finds carts in 'open' or 'paying' state older than a threshold and marks them 'expired'.
 * Intended to be called by a cron job.
 */
export const expireOldSharedCarts = internalMutation({
  args: {
    // Optional: Add arguments like expirationThreshold if needed, otherwise use a constant
  },
  handler: async (ctx, args) => {
    // Define the expiration threshold (e.g., 3 hours in milliseconds)
    const EXPIRATION_THRESHOLD_MS = 3 * 60 * 60 * 1000;
    const expirationTimestamp = Date.now() - EXPIRATION_THRESHOLD_MS;

    console.log(`Running cron job to expire shared carts older than ${new Date(expirationTimestamp).toISOString()}...`);

    // Find carts that are 'open' or 'paying' and created before the threshold
    const oldCarts = await ctx.db
      .query("sharedCarts")
      .withIndex("by_status", (q) => q.eq("status", "open")) // Query 'open' carts first
      .filter((q) => q.lt(q.field("createdAt"), expirationTimestamp))
      .collect();

    const oldPayingCarts = await ctx.db
      .query("sharedCarts")
      .withIndex("by_status", (q) => q.eq("status", "paying")) // Query 'paying' carts separately
      .filter((q) => q.lt(q.field("createdAt"), expirationTimestamp))
      .collect();

    const cartsToExpire = [...oldCarts, ...oldPayingCarts];

    if (cartsToExpire.length === 0) {
      console.log("No old shared carts found to expire.");
      return;
    }

    console.log(`Found ${cartsToExpire.length} shared carts to expire.`);

    // Update the status of each old cart to 'expired'
    for (const cart of cartsToExpire) {
      await ctx.db.patch(cart._id, { status: "expired" });
      console.log(`Expired shared cart ${cart._id}.`);
    }

    console.log("Finished expiring old shared carts.");
  },
});

// --- NEW MUTATION --- 
/**
 * Sets the delivery zone and calculates the fee for a shared cart.
 * Only the cart initiator can call this.
 * Requires the cart orderType to be 'Delivery' and status to be 'open'.
 */
export const setCartDeliveryZone = mutation({
  args: {
    cartId: v.id("sharedCarts"),
    deliveryZoneId: v.id("deliveryZones"),
    streetAddress: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx); // Verifies authentication
    if (!user) {
      throw new Error("Authentication failed unexpectedly.");
    }

    const cart = await ctx.db.get(args.cartId);

    if (!cart) {
      throw new Error("Cart not found.");
    }

    // Authorization: Only initiator can set the zone
    if (cart.initiatorId !== user.userId) {
      throw new Error("Permission denied: Only the cart initiator can set the delivery zone.");
    }

    // Validation: Must be a delivery order and still open
    if (cart.orderType !== 'Delivery') {
      throw new Error("Cannot set delivery zone for non-delivery orders.");
    }
    if (cart.status !== 'open') {
      // Consider allowing if status is 'checkingOut' if you add such a status
      throw new Error("Cannot set delivery zone for a cart that is not open.");
    }

    // Get the selected delivery zone details
    const deliveryZone = await ctx.db.get(args.deliveryZoneId);
    if (!deliveryZone || !deliveryZone.isActive) {
      throw new Error("Selected delivery zone is not valid or inactive.");
    }
    
    // Basic validation for new fields (ensure they are not just whitespace if provided)
    if (args.streetAddress !== undefined && args.streetAddress.trim() === "") {
        throw new Error("Street address cannot be empty.");
    }
    if (args.phoneNumber !== undefined && args.phoneNumber.trim() === "") {
        throw new Error("Phone number cannot be empty.");
    }
    // Add more specific phone number validation if needed (regex)

    // --- Calculate Delivery Fee (including Peak Hour Logic) --- 
    let deliveryFee = 0;
    const now = new Date(); // Use server time (UTC)
    const currentHour = now.getHours(); // Get hour (0-23) in UTC
    // Define Peak Hours (adjust as needed, e.g., 18:00 to 20:59 UTC)
    const peakStartHour = 18; 
    const peakEndHour = 21; 
    const isPeak = currentHour >= peakStartHour && currentHour < peakEndHour;

    deliveryFee = isPeak ? deliveryZone.peakFee : deliveryZone.baseFee;
    console.log(`[CONVEX M(sharedCarts:setDeliveryZone)] Cart: ${args.cartId}, Zone: ${args.deliveryZoneId}, Is Peak: ${isPeak}, Fee: ${deliveryFee}`);
    // --- End Fee Calculation ---

    // Update the cart document with zone, fee, and address details
    await ctx.db.patch(args.cartId, {
      deliveryZoneId: args.deliveryZoneId,
      deliveryFee: deliveryFee,
      deliveryStreetAddress: args.streetAddress, // Save address
      deliveryPhoneNumber: args.phoneNumber,   // Save phone
    });

    console.log(`[CONVEX M(sharedCarts:setDeliveryZone)] Successfully set delivery info for cart ${args.cartId}`);
    return { success: true, deliveryFee }; // Return fee for immediate display
  },
});

/**
 * INTERNAL: Creates a default shared cart for a new user.
 * This is intended to be called after a user is created.
 */
export const createDefaultSharedCartForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // 1. Find a default branch to associate the cart with.
    //    This could be the first branch created, or one marked as 'default'.
    const defaultBranch = await ctx.db.query("branches").first();

    if (!defaultBranch) {
      console.error("Cannot create default shared cart: No branches found in the database.");
      // Depending on requirements, you might throw an error or just log this.
      // For now, we'll stop execution for this user if no branch is available.
      return;
    }

    // 2. Generate an invite code
    const inviteCode = nanoid(8);

    // 3. Create the shared cart with default values
    const cartId = await ctx.db.insert("sharedCarts", {
      initiatorId: userId,
      branchId: defaultBranch._id, // Use the ID of the found branch
      status: "open",
      paymentMode: "split", // Sensible default
      orderType: "Take-out", // Sensible default
      inviteCode: inviteCode,
      totalAmount: 0,
      createdAt: Date.now(),
    });

    // 4. Add the new user as the first member of their own cart
    await ctx.db.insert("sharedCartMembers", {
      cartId: cartId,
      userId: userId,
      paymentStatus: "pending",
      amountDue: 0,
    });

    console.log(`Created default shared cart ${cartId} for new user ${userId} with invite code ${inviteCode}`);

    return { cartId, inviteCode };
  },
});