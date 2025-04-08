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
  }),

  menuCategories: defineTable({
    name: v.string(), // Category name (e.g., "Burgers", "Drinks")
    description: v.optional(v.string()), // Optional category description
    imageUrl: v.optional(v.string()), // Add optional imageUrl field HERE
    order: v.optional(v.number()), // Optional field for ordering categories
    // Removed: location, eventDate, price, totalTickets, userId, imageStorageId, is_cancelled
  }),

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
  })
    .index("by_category", ["categoryId"])
    .index("by_availability", ["isAvailable"])
    .index("by_category_availability", ["categoryId", "isAvailable"])
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
    orderType: v.union(
      v.literal("Delivery"),
      v.literal("Dine-In"),
      v.literal("Take-out")
    ),
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
  })
    .index("by_user", ["userId"])
    .index("by_branch", ["branchId"])
    .index("by_status", ["status"])
    .index("by_branch_status", ["branchId", "status"])
    .index("by_paystack_reference", ["paystackReference"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    paystackSubaccountId: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
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
    // Optional future fields:
    // minOrderValue: v.optional(v.number()), // Minimum cart total (kobo/cents) to apply
    // applicableItems: v.optional(v.array(v.id("menuItems"))), // Limit to specific items
    // applicableCategories: v.optional(v.array(v.id("menuCategories"))), // Limit to specific categories
  })
    .index("by_code", ["code"]) // Index for quick lookup by code string
    .index("by_activity", ["isActive"])
    .index("by_banner_status", ["isBanner", "isActive"])
    .index("by_placement", ["placement", "isActive"])
    .index("by_placement_active_endDate", ["placement", "isActive", "endDate"]),
});
