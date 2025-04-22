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
import { Id } from "./_generated/dataModel";
import { getUserFromAuth } from "./lib/getUserFromAuth"; // Helper to get Clerk user
import { api } from "./_generated/api"; // Import the generated API object

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
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to create a shared cart.");
    }

    const inviteCode = nanoid(8); // Generate a short, unique invite code

    const cartId = await ctx.db.insert("sharedCarts", {
      initiatorId: user.userId,
      branchId: args.branchId,
      status: "open",
      paymentMode: args.paymentMode,
      orderType: args.orderType,
      inviteCode: inviteCode,
      totalAmount: 0, // Initial total
      createdAt: Date.now(),
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
 * Removes an item from a shared cart.
 * Only the user who added the item or the cart initiator can remove it.
 * Cart must be in 'open' status.
 */
export const removeSharedCartItem = mutation({
  args: {
    cartItemId: v.id("sharedCartItems"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to remove items from a shared cart.");
    }

    // Fetch the specific item to be removed
    const itemToRemove = await ctx.db.get(args.cartItemId);
    if (!itemToRemove) {
      throw new Error("Item not found.");
    }

    // Fetch the cart
    const cart = await ctx.db.get(itemToRemove.cartId);
    if (!cart) {
      // Should not happen if item exists, but good practice to check
      throw new Error("Associated cart not found.");
    }

    // Check if cart is still open
    if (cart.status !== "open") {
      throw new Error("Cannot remove items from a cart that is not open.");
    }

    // Check permissions: User must be the one who added the item OR the cart initiator
    if (itemToRemove.userId !== user.userId && cart.initiatorId !== user.userId) {
      throw new Error("Permission denied: You cannot remove this item.");
    }

    // Delete the item
    await ctx.db.delete(args.cartItemId);

    // Recalculate and update the total amount
    const newTotal = await calculateCartTotal(ctx.db, cart._id);
    await ctx.db.patch(cart._id, { totalAmount: newTotal });

    // Optional: Schedule internal mutation if calculation is complex
    // await ctx.scheduler.runAfter(0, internal.sharedCarts.updateCartTotal, { cartId: cart._id });

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
    userId: v.string(), // Clerk User ID of the member who paid
    paymentReference: v.string(),
    amountPaid: v.number(), // Amount paid in kobo/cents
  },
  handler: async (ctx, { cartId, userId, paymentReference, amountPaid }) => {
    console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Updating payment for user ${userId} in cart ${cartId}`);

    // Find the specific member entry
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) => q.eq("cartId", cartId).eq("userId", userId))
      .first();

    if (!member) {
      console.error(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Member ${userId} not found in cart ${cartId}.`);
      // Decide how to handle: throw error? Log and continue?
      // Throwing might cause webhook retries if the member *should* exist.
      throw new Error(`Member ${userId} not found in cart ${cartId}`);
    }

    // Update the member's payment status and potentially store reference/amount
    await ctx.db.patch(member._id, {
      paymentStatus: "paid",
      paymentReference: paymentReference, // Use the correct field name from schema
      amountPaid: amountPaid, // Use the correct field name from schema
      // Note: We might still need to reconcile amountPaid vs amountDue later
    });

    console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Payment status for user ${userId} in cart ${cartId} updated to 'paid'.`);

    // TODO: Add logic here to check if ALL members have paid (if mode is 'split')
    // or if the single payer has paid (if mode is 'payAll')
    // If the cart is fully paid, trigger the order creation process.
    // This might involve another internal mutation or action.
    // Example check (needs refinement based on paymentMode):
    // const cart = await ctx.db.get(cartId);
    // if (cart && cart.paymentMode === 'split') {
    //   const allMembers = await ctx.db.query("sharedCartMembers").withIndex("by_cart", q => q.eq("cartId", cartId)).collect();
    //   const allPaid = allMembers.every(m => m.paymentStatus === 'paid');
    //   if (allPaid) {
    //     console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] All members in split cart ${cartId} have paid. Triggering order creation.`);
    //     // await ctx.runMutation(internal.orders.createOrderFromSharedCart, { cartId });
    //   }
    // } else if (cart && cart.paymentMode === 'payAll') {
    //    console.log(`[CONVEX internalM(sharedCarts:internalUpdatePaymentStatus)] Single payer for cart ${cartId} has paid. Triggering order creation.`);
    //    // await ctx.runMutation(internal.orders.createOrderFromSharedCart, { cartId });
    // }
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
    let user;
    try {
      user = await getUserFromAuth(ctx); // Attempt to get user
    } catch (error) {
      // If getUserFromAuth throws (e.g., no identity), return null early.
      // The frontend useQuery hook will handle this as loading/error or null data.
      console.warn("getSharedCart: User not authenticated yet or error fetching identity.", error);
      return null; // User not authenticated or error fetching identity
    }
    // If we reach here, 'user' is guaranteed to be non-null by the check in getUserFromAuth
    // or the early return above.

    // Verify user is a member
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) =>
        q.eq("cartId", args.cartId).eq("userId", user!.userId) // Safe to access user.userId
      )
      .first();

    if (!member) {
      // User is authenticated but not a member of this specific cart.
      console.warn(`getSharedCart: User ${user!.userId} is not a member of cart ${args.cartId}.`);
      return null; // Return null to indicate access denied/not found for this user
    }

    // Fetch cart details
    const cart = await ctx.db.get(args.cartId);
    if (!cart) {
      return null; // Or throw if cart must exist
    }

    // Fetch members (consider fetching associated user names/details if needed)
    const members = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    // Fetch items (consider fetching associated menu item names/images if needed)
    const items = await ctx.db
      .query("sharedCartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", args.cartId))
      .collect();

    // Enrich items with menu item details
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return {
          ...item,
          name: menuItem?.name ?? "Unknown Item",
          imageUrl: menuItem?.imageUrl,
          // Add other menuItem fields if needed
        };
      })
    );

    // Enrich members with user details (assuming a 'users' table indexed by Clerk's userId)
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const userProfile = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", member.userId))
          .first(); // Assuming Clerk userId is unique in the users table
        // Log the fetched profile to check for imageUrl
        console.log(`Fetched profile for member ${member.userId}:`, userProfile);
        return {
          ...member,
          name: userProfile?.name ?? "Unknown User",
          imageUrl: userProfile?.imageUrl, // Add imageUrl from the user profile
        };
      })
    );

    return {
      ...cart,
      members: membersWithDetails, // Return enriched members
      items: itemsWithDetails,     // Return enriched items
    };
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