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

/**
 * Initiates the payment process for a shared cart in 'split' mode.
 * Calculates amount due per member and updates cart status.
 * Only callable by a member of the cart.
 * TODO: Integrate with Paystack initiation logic.
 */
export const startSplitPayment = mutation({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to start split payment.");
    }
    const cart = await ctx.db.get(args.cartId);

    if (!cart) throw new Error("Cart not found.");
    // Allow proceeding if status is 'open' OR 'paying' (in case multiple users click)
    if (cart.status !== "open" && cart.status !== "paying") {
        throw new Error(`Cart status is '${cart.status}', cannot start payment.`);
    }
    if (cart.paymentMode !== "split") throw new Error("Cart is not in split payment mode.");

    // Verify user is a member
    const member = await ctx.db
      .query("sharedCartMembers")
      .withIndex("by_cart_user", (q) => q.eq("cartId", args.cartId).eq("userId", user.userId))
      .first();
    if (!member) throw new Error("Access denied: You are not a member of this cart.");

    // --- Amount Due Calculation Logic (Equal Split with Remainder Distribution) ---
    const members = await ctx.db.query("sharedCartMembers").withIndex("by_cart", q => q.eq("cartId", args.cartId)).collect();
    const totalAmount = cart.totalAmount; // Amount in kobo
    const memberCount = members.length;
    if (memberCount === 0) throw new Error("Cannot split payment with zero members.");

    const baseAmountPerMember = Math.floor(totalAmount / memberCount);
    let remainder = totalAmount % memberCount;

    // Update amountDue for all members, distributing the remainder
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      let amountDue = baseAmountPerMember;
      if (remainder > 0) {
        amountDue += 1; // Add one kobo from the remainder
        remainder--;    // Decrement the remainder
      }
      // Patch each member individually
      await ctx.db.patch(member._id, { amountDue: amountDue });
    }
    // --- End Calculation Logic ---

    // Re-fetch the current user's member document AFTER the update loop to get the correct amountDue
    const updatedCurrentUserMember = await ctx.db
        .query("sharedCartMembers")
        .withIndex("by_cart_user", (q) => q.eq("cartId", args.cartId).eq("userId", user.userId))
        .first();

    if (!updatedCurrentUserMember) {
        // Should not happen if they were part of the members list before
        throw new Error("Failed to refetch member details after update.");
    }

    const userAmountDue = updatedCurrentUserMember.amountDue;
    if (userAmountDue === undefined || userAmountDue <= 0) {
        // This might happen if calculation failed or total was zero
        throw new Error("Could not determine a valid amount due for user.");
    }

    // Ensure user email is available for Paystack
    if (!user.email) {
        // Consider fetching from a user profile table if email isn't directly on identity
        throw new Error("User email is required for payment initiation.");
    }

    // Return the necessary data for the frontend to call the Paystack action
    return {
        success: true,
        status: "paying", // Confirm status changed
        paymentData: {
            cartId: args.cartId,
            userId: user.userId,
            email: user.email,
            amountKobo: userAmountDue,
        }
     };
  },
});

/**
 * Initiates the payment process for a shared cart in 'payAll' mode.
 * Locks the cart status. Only callable by the initiator.
 * TODO: Integrate with Paystack initiation logic for the full amount.
 */
export const startPayAll = mutation({
  args: {
    cartId: v.id("sharedCarts"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromAuth(ctx);
    if (!user) {
      throw new Error("Authentication required to start pay-all.");
    }
    const cart = await ctx.db.get(args.cartId);

    if (!cart) throw new Error("Cart not found.");
    if (cart.status !== "open") throw new Error("Cart is not open for payment.");
    if (cart.paymentMode !== "payAll") throw new Error("Cart is not in pay-all mode.");
    if (cart.initiatorId !== user.userId) throw new Error("Only the initiator can pay for all.");

    // Update cart status to 'locked' (prevents further changes/payments by others)
    await ctx.db.patch(args.cartId, { status: "locked" });

    // Ensure initiator email is available for Paystack
    if (!user.email) {
      // Consider fetching from a user profile table if email isn't directly on identity
      throw new Error("Initiator email is required for payment initiation.");
    }

    // Return the necessary data for the frontend to call the Paystack action
    return {
        success: true,
        status: "locked", // Confirm status changed
        paymentData: {
            cartId: args.cartId,
            userId: user.userId, // Initiator's ID
            email: user.email,   // Initiator's email
            amountKobo: cart.totalAmount, // Full cart amount
        }
    };
  },
});

/**
 * Cancels a shared cart (e.g., if the initiator decides to abandon it).
 * Only the cart initiator can cancel it.
 * Cart must NOT be in 'completed' status.
 */
export const cancelSharedCart = mutation({
    args: {
        cartId: v.id("sharedCarts"),
    },
    handler: async (ctx, args) => {
        const user = await getUserFromAuth(ctx);
        if (!user) {
            throw new Error("Authentication required to cancel a shared cart.");
        }

        const cart = await ctx.db.get(args.cartId);
        if (!cart) {
            throw new Error("Cart not found.");
        }

        if (cart.initiatorId !== user.userId) {
            throw new Error("Only the cart initiator can cancel the cart.");
        }

        if (cart.status === "completed") {
            throw new Error("Cannot cancel a completed cart.");
        }

        // Update the cart status to 'cancelled'
        await ctx.db.patch(args.cartId, { status: "cancelled" });

        // Optional: Clear cart items and members? Depends on your data model.
        // For now, just set the status.

        return { success: true };
    },
});

// --- Queries ---

/**
 * Gets the details of a specific shared cart, including members and items.
 * Requires the requesting user to be a member of the cart.
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