import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  branches: defineTable({
    name: v.string(),
    address: v.string(), // Consider making this an object later for structured address
    operatingHours: v.string(), // e.g., "Mon-Fri 9am-10pm, Sat-Sun 11am-11pm" - Can be refined
    supportedOrderTypes: v.array(
      v.union(
        v.literal("Delivery"),
        v.literal("Dine-In"),
        v.literal("Take-out")
      )
    ),
    // deliveryZoneBoundaries: v.optional(v.any()), // Placeholder for GeoJSON or similar
    // contactInfo: v.optional(v.string()), // Placeholder
    contactNumber: v.optional(v.string()),
    deliveryZone: v.optional(v.object({ /* Define zone structure, e.g., polygon coordinates */ })),
    isActive: v.optional(v.boolean()),
    minimumOrderAmount: v.optional(v.number()), // In kobo/cents
    deliveryFee: v.optional(v.number()), // In kobo/cents
  }),

  menuCategories: defineTable({
    name: v.string(), // Category name (e.g., "Burgers", "Drinks")
    description: v.optional(v.string()), // Optional category description
    imageUrl: v.optional(v.string()), // Add optional imageUrl field HERE
    order: v.optional(v.number()), // Optional field for ordering categories
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    // Removed: location, eventDate, price, totalTickets, userId, imageStorageId, is_cancelled
  })
    .index("by_displayOrder", ["displayOrder"]),

  menuItems: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    // imageStorageId: v.optional(v.id("_storage")), // Deprecated: Using imageUrl instead
    imageUrl: v.optional(v.string()), // Store image URL directly
    categoryId: v.id("menuCategories"),
    isAvailable: v.boolean(),
    // dietaryInfo: v.optional(v.array(v.string())), // e.g., ["Vegetarian", "Gluten-Free"]
    // availabilityStatus: v.union(v.literal("Available"), v.literal("Unavailable")), // Or boolean
    // customizationOptions: v.optional(v.any()), // Placeholder for variants/add-ons
    displayOrder: v.optional(v.number()),
    // branchId: v.optional(v.id("branches")), // If items are branch-specific
  })
    .index("by_category", ["categoryId"])
    .index("by_availability", ["isAvailable"])
    .index("by_category_availability", ["categoryId", "isAvailable"])
    .index("by_category_order", ["categoryId", "displayOrder"])
    // Add search index
    .searchIndex("search_name_description", {
        searchField: "name",
        filterFields: ["categoryId", "isAvailable"], // Optional: allow filtering search results
    })
    // Example including description in search:
    // .searchIndex("search_name_desc", {
    //     searchField: ["name", "description"],
    //     filterFields: ["categoryId", "isAvailable"],
    // })
    ,

  orders: defineTable({
    branchId: v.id("branches"),
    userId: v.string(),
    customerName: v.optional(v.string()),
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      quantity: v.number(),
      unitPrice: v.number(), // Store unit price at time of order
      name: v.optional(v.string()),
    })),
    totalAmount: v.number(), // Total in kobo/cents
    status: v.union(
      v.literal("Pending Confirmation"),
      v.literal("Received"),
      v.literal("Preparing"),
      v.literal("Ready for Pickup"),
      v.literal("Out for Delivery"),
      v.literal("Completed"),
      v.literal("Cancelled")
    ),
    paymentStatus: v.string(), // Add: e.g., "Pending", "Paid", "Failed"
    orderType: v.optional(v.union(
      v.literal("Delivery"),
      v.literal("Dine-In"),
      v.literal("Take-out")
    )),
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
    discountAmount: v.optional(v.number()), // Amount discounted in kobo/cents
    paystackReference: v.optional(v.string()), // Reference from payment gateway
    createdAt: v.number(), // Use number for timestamp from Date.now()
    contactPhoneNumber: v.optional(v.string()), // For delivery/takeout updates
    notes: v.optional(v.string()), // Special instructions from user
    estimatedDeliveryTime: v.optional(v.number()), // Timestamp
    actualDeliveryTime: v.optional(v.number()), // Timestamp
    paymentMethod: v.optional(v.string()), // e.g., "Card", "Cash"
    paymentTransactionId: v.optional(v.string()), // Reference from payment gateway
    promoCode: v.optional(v.string()),
    taxAmount: v.optional(v.number()), // In kobo/cents
  })
    .index("by_user", ["userId"])
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"])
    .index("by_branch_status", ["branchId", "status"])
    .index("by_paystack_reference", ["paystackReference"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(), // Clerk User ID
    imageUrl: v.optional(v.string()),
    paystackSubaccountId: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    credits: v.optional(v.number()),
    address: v.optional(v.object({
      street: v.optional(v.string()), 
      customerPhone: v.optional(v.string()), 
      // Removed city, state, postalCode, country
    })),
    // lastSeen: v.optional(v.number()),
    // preferences: v.optional(v.object({ ... }))
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),

  promotions: defineTable({
    code: v.string(),          // The promo code string (e.g., "HOGIS10")
    description: v.optional(v.string()), // Optional description for admin
    discountType: v.union(      // Type of discount
      v.literal("percentage"),
      v.literal("fixed")
    ),
    discountValue: v.number(),  // Percentage (e.g., 10 for 10%) or fixed amount (in kobo/cents)
    minOrderAmount: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isActive: v.boolean(),      // Whether the code is currently active
    usageLimit: v.optional(v.number()),  // Optional total usage limit
    usageCount: v.number(),     // Current number of times used (initialize at 0)
    isBanner: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()), // Image for banner promos
    placement: v.optional(v.union(
      v.literal("header"),
      v.literal("in-menu")
    )),
    bannerType: v.optional(v.union(v.literal("main"), v.literal("in-menu"))), // Where the banner shows
    bannerImageUrl: v.optional(v.string()), // URL for the banner image
    bannerLink: v.optional(v.string()), // Optional URL to link the banner to
    // Optional future fields:
    // minOrderValue: v.optional(v.number()), // Minimum cart total (kobo/cents) to apply
    // applicableItems: v.optional(v.array(v.id("menuItems"))), // Limit to specific items
    // applicableCategories: v.optional(v.array(v.id("menuCategories"))), // Limit to specific categories
  })
    .index("by_code", ["code"]) // Index for quick lookup by code string
    .index("by_activity", ["isActive"])
    .index("by_banner_status", ["isBanner", "isActive"])
    .index("by_placement", ["placement", "isActive"])
    .index("by_placement_active_endDate", ["placement", "isActive", "endDate"])
    .index("by_active_date", ["isActive", "endDate"]),

  // <<< START SHARED CART TABLES >>>
  sharedCarts: defineTable({
    initiatorId: v.string(), // Clerk User ID of the creator
    branchId: v.optional(v.id("branches")), // Make branchId optional
    status: v.union(
      v.literal("open"),      // Cart is active, members can join/add items
      v.literal("locked"),    // Payment process started (Pay for All mode), no more changes
      v.literal("paying"),    // Split payment in progress
      v.literal("completed"), // All payments successful
      v.literal("expired"),    // Cart timed out
      v.literal("cancelled")  // Cart was cancelled by the initiator
    ),
    paymentMode: v.union(
      v.literal("split"),     // Each member pays their share
      v.literal("payAll")     // Initiator pays the total amount
    ),
    inviteCode: v.optional(v.string()),   // Unique code to join this cart (optional for old data)
    totalAmount: v.number(),  // Total in kobo/cents, updated dynamically
    createdAt: v.number(),    // Timestamp
    expiresAt: v.optional(v.number()), // Optional timestamp for old data
    items: v.optional(v.any()), // Optional field for old data that might have items directly
    members: v.optional(v.any()), // Optional field for old data that might have members directly
    orderType: v.optional(v.union(
      v.literal("Delivery"),
      v.literal("Dine-In"),
      v.literal("Take-out")
    )),
    associatedOrderId: v.optional(v.id("orders")), // Link to the final order created
  })
    .index("by_initiator", ["initiatorId"])
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"])
    .index("by_invite_code", ["inviteCode"]), // For joining via code

  sharedCartMembers: defineTable({
    cartId: v.id("sharedCarts"),
    userId: v.string(),       // Clerk User ID of the member
    paymentStatus: v.union(
      v.literal("pending"),   // Default status
      v.literal("paid"),      // Payment successful
      v.literal("failed")     // Payment attempt failed
    ),
    amountDue: v.number(),    // Amount this member owes (kobo/cents) - calculated for split payment
    paystackReference: v.optional(v.string()), // Reference if they paid
    joinedAt: v.optional(v.number()), // Timestamp when user joined
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
  })
    .index("by_cart", ["cartId"])
    .index("by_user", ["userId"])
    .index("by_cart_user", ["cartId", "userId"]) // Unique constraint simulation
    .index("by_cart_payment_status", ["cartId", "paymentStatus"]), // To check if all paid

  sharedCartItems: defineTable({
    cartId: v.id("sharedCarts"),
    userId: v.string(),       // Clerk User ID of the user who added this item
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    unitPrice: v.number(),    // Price per unit at the time of adding (kobo/cents)
    addedAt: v.optional(v.number()), // Timestamp
    itemName: v.optional(v.string()),
    // Optional: Add customization details here if needed later
  })
    .index("by_cart", ["cartId"])
    .index("by_user", ["userId"])
    .index("by_cart_user", ["cartId", "userId"])
    .index("by_cart_menuItem", ["cartId", "menuItemId"]),
  // <<< END SHARED CART TABLES >>>

  userActivity: defineTable({
    userId: v.string(), // Clerk User ID
    lastActive: v.number(), // Timestamp of last activity
  }).index("by_user", ["userId"]),

  // -- NEW FEEDBACK TABLE --
  feedback: defineTable({
    orderId: v.id("orders"),
    userId: v.string(), // Clerk User ID
    rating: v.optional(v.number()), // Optional: 1-5 star rating
    comment: v.string(),
    submittedAt: v.number(), // Timestamp
    // Optional: Track if feedback has been reviewed/addressed by admin
    // isReviewed: v.optional(v.boolean()),
    // adminNotes: v.optional(v.string()),
  })
  .index("by_order", ["orderId"])
  .index("by_user", ["userId"]),
});
