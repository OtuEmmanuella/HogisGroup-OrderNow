import { query, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Import admin check helper

// Interface for the return value of validatePromoCode
export interface ValidatedPromo {
    promoId: Id<"promotions">;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    calculatedDiscount: number; // Calculated discount amount in kobo/cents
}

// Query to validate a promo code and calculate the discount
export const validatePromoCode = query({
    args: {
        code: v.string(),
        currentCartTotalKobo: v.number(),
    },
    handler: async (ctx, { code, currentCartTotalKobo }): Promise<ValidatedPromo | { error: string }> => {
        if (!code) {
            return { error: "Promo code cannot be empty." };
        }

        const promo = await ctx.db
            .query("promotions")
            .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
            .first();

        if (!promo) {
            return { error: "Invalid promo code." };
        }

        // --- Validation Checks ---
        if (!promo.isActive) {
            return { error: "This promo code is not active." };
        }
        if (promo.endDate && promo.endDate < Date.now()) {
            return { error: "This promo code has expired." };
        }
        if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
            return { error: "This promo code has reached its usage limit." };
        }
        if (promo.minOrderAmount != null && currentCartTotalKobo < promo.minOrderAmount) {
            return { error: `Minimum order value of ₦${(promo.minOrderAmount / 100).toFixed(2)} not met.` };
        }

        // --- Calculate Discount ---
        let calculatedDiscount = 0;
        if (promo.discountType === "percentage") {
            // Ensure value is treated as percentage (e.g., 10 for 10%)
            calculatedDiscount = Math.round(currentCartTotalKobo * (promo.discountValue / 100));
        } else if (promo.discountType === "fixed") {
            // Ensure fixed amount doesn't exceed cart total
            calculatedDiscount = Math.min(promo.discountValue, currentCartTotalKobo);
        }

        // Ensure discount isn't negative
        calculatedDiscount = Math.max(0, calculatedDiscount);

        console.log(`Promo code ${code} validated. Discount: ${calculatedDiscount} kobo`);

        return {
            promoId: promo._id,
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            calculatedDiscount: calculatedDiscount,
        };
    },
});

// Internal mutation to increment usage count - called AFTER successful order placement
export const incrementPromoUsage = mutation({
    args: { promoId: v.id("promotions") },
    handler: async (ctx, { promoId }) => {
        // Intentionally internal-like, called from createOrder. No direct auth needed here.
        const promo = await ctx.db.get(promoId);
        if (promo) {
            const currentCount = promo.usageCount || 0;
            await ctx.db.patch(promoId, { usageCount: currentCount + 1 });
        }
    }
});

// Query to get active promotions marked for 'in-menu' placement
export const getActiveInMenuBanners = query({
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("promotions")
      // Use the compound index correctly
      .withIndex("by_placement_active_endDate", (q) =>
        // Provide values for the first two fields of the index
        q.eq("placement", "in-menu").eq("isActive", true)
        // No need to chain another .eq, the index handles these fields
      )
      // Filter the results further for the date range
      // Ensure end date is in the future OR null
      .filter((q) => q.or(q.eq(q.field("endDate"), null), q.gt(q.field("endDate"), now)))
      // Optional: Ensure start date is in the past or null
      // .filter(q => q.or(q.eq(q.field("startDate"), null), q.lt(q.field("startDate"), now)))
      .collect();
  },
});

// Query to get active promotions marked for 'header' placement (updated)
export const getActiveBannerPromos = query({
    args: {},
    handler: async (ctx) => {
      const now = Date.now();
      const banners = await ctx.db
        .query("promotions")
        // Use the index for placement and activity status
        .withIndex("by_placement_active_endDate", (q) => 
          q.eq("placement", "header").eq("isActive", true)
        )
        // Filter further for date validity
        .filter((q) => 
          q.and(
            // Start date must be null/undefined OR in the past
            q.or(q.eq(q.field("startDate"), null), q.eq(q.field("startDate"), undefined), q.lte(q.field("startDate"), now)),
            // End date must be null/undefined OR in the future
            q.or(q.eq(q.field("endDate"), null), q.eq(q.field("endDate"), undefined), q.gte(q.field("endDate"), now))
          )
        )
        .collect();
  
      return banners;
    },
  });

// --- Admin Promotion Management ---

// Query to fetch all promotions for the admin panel
export const getAllPromotionsAdmin = query({
  args: {},
  handler: async (ctx) => {
    await ensureAdmin(ctx); // Ensure only admins can access
    const promotions = await ctx.db.query("promotions").order("desc").collect();
    return promotions;
  },
});

// Mutation to create a new promotion
export const createPromotion = mutation({
  args: {
    code: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // For now, assume URL is provided directly
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountValue: v.number(),
    isActive: v.optional(v.boolean()),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()),   // Timestamp
    usageLimit: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()), // In Kobo
    placement: v.optional(v.union(v.literal("header"), v.literal("in-menu"))),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    // Validate code uniqueness (case-insensitive)
    const existingPromo = await ctx.db
      .query("promotions")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();
    if (existingPromo) {
      throw new Error(`Promotion code '${args.code}' already exists.`);
    }

    // Validate dates if both provided
    if (args.startDate && args.endDate && args.startDate >= args.endDate) {
      throw new Error("Start date must be before end date.");
    }

    const newPromoId = await ctx.db.insert("promotions", {
      code: args.code.trim().toUpperCase(), // Ensure uppercase
      description: args.description,
      imageUrl: args.imageUrl,
      discountType: args.discountType,
      discountValue: args.discountValue,
      isActive: args.isActive ?? true, // Default to active
      startDate: args.startDate,
      endDate: args.endDate,
      usageLimit: args.usageLimit,
      usageCount: 0, // Initialize usage count
      minOrderAmount: args.minOrderAmount,
      placement: args.placement,
    });
    return newPromoId;
  },
});

// Mutation to update an existing promotion
export const updatePromotion = mutation({
  args: {
    promoId: v.id("promotions"),
    code: v.optional(v.string()), // Allow updating code, but check uniqueness
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
    discountValue: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    placement: v.optional(v.union(v.literal("header"), v.literal("in-menu"))),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const { promoId, ...updates } = args;

    const existingPromo = await ctx.db.get(promoId);
    if (!existingPromo) {
      throw new Error("Promotion not found.");
    }

    // Validate code uniqueness if changed
    if (updates.code) {
        updates.code = updates.code.trim().toUpperCase(); // Normalize
        if (updates.code !== existingPromo.code) {
             const conflictingPromo = await ctx.db
                .query("promotions")
                .withIndex("by_code", (q) => q.eq("code", updates.code!))
                .filter(q => q.neq(q.field("_id"), promoId)) // Exclude self
                .first();
            if (conflictingPromo) {
                throw new Error(`Promotion code '${updates.code}' is already in use by another promotion.`);
            }
        }
    }

    // Validate dates if both provided (consider existing dates too)
    const newStartDate = updates.startDate ?? existingPromo.startDate;
    const newEndDate = updates.endDate ?? existingPromo.endDate;
    if (newStartDate && newEndDate && newStartDate >= newEndDate) {
      throw new Error("Start date must be before end date.");
    }

    // Create update object, handling potential undefined values correctly
    const updateData: Partial<typeof existingPromo> = {};
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (updateData as any)[key] = value;
        }
    }

    // Remove optional fields explicitly if they are passed as `undefined` 
    // or handle sending `null` from the client if you want to clear fields.
    // Currently, this logic only updates fields that are explicitly provided in `args`.

    await ctx.db.patch(promoId, updateData);
    return promoId;
  },
});

// Mutation to delete a promotion
export const deletePromotion = mutation({
  args: { promoId: v.id("promotions") },
  handler: async (ctx, { promoId }) => {
    await ensureAdmin(ctx);

    const existingPromo = await ctx.db.get(promoId);
    if (!existingPromo) {
      // Optional: Throw error or just return indicating not found
      console.warn(`Attempted to delete non-existent promotion: ${promoId}`);
      return; // Or throw new Error("Promotion not found");
    }

    await ctx.db.delete(promoId);
    return promoId;
  },
});

// TODO: Add mutations for creating/updating promotions to handle isBanner and imageStorageId 