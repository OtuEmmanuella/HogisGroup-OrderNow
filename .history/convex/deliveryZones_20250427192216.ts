import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Assuming admin rights needed for seeding
import { getUserFromAuth } from "../lib/getUserFromAuth"; // Ensure this path is correct
import { api } from "./_generated/api";

// Define the structure for a delivery zone document
export const deliveryZoneSchema = {
  name: v.string(),
  description: v.string(),
  baseFee: v.number(), // Fee in kobo/cents
  peakFee: v.number(), // Fee in kobo/cents during peak hours
  // Optional: Add fields like 'areaIdentifier' or 'coordinates' if needed for more complex logic
  // Optional: Add 'isActive' flag
  isActive: v.optional(v.boolean()),
};

// Query to list all active delivery zones
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("deliveryZones")
      .filter((q) => q.eq(q.field("isActive"), true)) // Only return active zones
      .collect();
  },
});

// Query to get a single delivery zone by ID (useful for order details)
export const getById = query({
    args: { zoneId: v.id("deliveryZones") },
    handler: async (ctx, { zoneId }) => {
        return await ctx.db.get(zoneId);
    },
});

/**
 * Fetches all active delivery zones.
 * Assumes zones are active if isActive is true or undefined/null.
 */
export const getActiveDeliveryZones = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db
      .query("deliveryZones")
      // Filter for zones explicitly marked as active OR where isActive is not set to false
      // This handles cases where isActive might be undefined/null initially
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    return zones;
  },
});

/**
 * Gets a specific delivery zone by its ID.
 * Useful for displaying the name after selection.
 */
export const getDeliveryZoneById = query({
    args: { zoneId: v.id("deliveryZones") },
    handler: async (ctx, args) => {
        try {
            const zone = await ctx.db.get(args.zoneId);
            return zone;
        } catch (error) {
            console.error(`Failed to get delivery zone ${args.zoneId}:`, error);
            return null; // Return null if not found or error occurs
        }
    },
});

// --- Seeding Mutation --- 
// Combine all unique zones from the previous branch structure
const initialDeliveryZones: Omit<Doc<"deliveryZones">, "_id" | "_creationTime">[] = [
  // From Luxury Suites Branch
  {
    name: "Marian",
    description: "Ediba, Effio Ette, Atekong, parts of State Housing, up to Ekong Etta",
    baseFee: 160000, // 1600 NGN in kobo
    peakFee: 190000,
    isActive: true,
  },
  {
    name: "State Housing",
    description: "All areas within State Housing Estate",
    baseFee: 140000,
    peakFee: 170000,
    isActive: true,
  },
  {
    name: "8 Miles",
    description: "8 Miles / Federal Housing / Akpabuyo Road",
    baseFee: 350000,
    peakFee: 380000,
    isActive: true,
  },
  // From Royale & Apartment Branch (Note: State Housing Core is similar to State Housing, decide if merge needed)
  {
    name: "State Housing Core", // Consider merging or renaming if identical to "State Housing"
    description: "Main State Housing Estate area",
    baseFee: 130000,
    peakFee: 160000,
    isActive: true,
  },
  {
    name: "Parliamentary",
    description: "Parliamentary Village / MCC Road area",
    baseFee: 180000,
    peakFee: 210000,
    isActive: true,
  },
  {
    name: "Satellite Town",
    description: "Satellite Town / Ekorinim areas",
    baseFee: 200000,
    peakFee: 230000,
    isActive: true,
  },
  // From Exclusive Suites Branch
  {
    name: "Atekong Core",
    description: "Atekong Drive and immediate surroundings",
    baseFee: 140000,
    peakFee: 170000,
    isActive: true,
  },
  {
    name: "Lemna",
    description: "Lemna Road / E1-E2 Estate areas",
    baseFee: 160000,
    peakFee: 190000,
    isActive: true,
  },
  {
    name: "Extended Zone",
    description: "Ekorinim II / Diamond Hill / Spring Road",
    baseFee: 220000,
    peakFee: 250000,
    isActive: true,
  }
];

// One-off mutation to seed initial delivery zones
export const seedInitialDeliveryZones = mutation({
  args: {}, 
  handler: async (ctx) => {
    // IMPORTANT: Add auth check if needed
    // await ensureAdmin(ctx);

    console.log("Attempting to seed initial delivery zones...");
    let zonesAdded = 0;

    for (const zoneData of initialDeliveryZones) {
      // Check if a zone with the same name already exists
      const existing = await ctx.db
        .query("deliveryZones")
        .filter((q) => q.eq(q.field("name"), zoneData.name))
        .first();

      if (!existing) {
        await ctx.db.insert("deliveryZones", zoneData);
        zonesAdded++;
        console.log(`Added delivery zone: ${zoneData.name}`);
      } else {
         console.log(`Delivery zone already exists: ${zoneData.name}. Skipping.`);
         // Optional: Add logic here to update existing zones if needed
      }
    }
    console.log(`Seeding complete. Added ${zonesAdded} new delivery zones.`);
    return { zonesAdded };
  },
});

/**
 * Seeds the database with initial delivery zones if none exist.
 * Requires admin privileges.
 */
export const seedDeliveryZones = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getUserFromAuth(ctx);

        // Authorization: Check if the user is an admin
        if (!user || user.role !== "admin") {
            throw new Error("Unauthorized: Admin privileges required to seed data.");
        }

        // Check if zones already exist to prevent duplicates
        const existingZones = await ctx.db.query("deliveryZones").take(1);
        if (existingZones.length > 0) {
            console.log("Delivery zones already exist, skipping seeding.");
            return { success: true, message: "Zones already seeded." };
        }

        // Define sample zones (adjust names, descriptions, and fees as needed)
        const sampleZones = [
            {
                name: "Zone A (Local)",
                description: "Nearby areas, standard delivery.",
                baseFee: 50000, // 500 NGN in kobo
                peakFee: 75000, // 750 NGN in kobo
                isActive: true,
            },
            {
                name: "Zone B (Mid-Range)",
                description: "Slightly further areas.",
                baseFee: 80000, // 800 NGN in kobo
                peakFee: 110000, // 1100 NGN in kobo
                isActive: true,
            },
            {
                name: "Zone C (Extended)",
                description: "Outer delivery areas.",
                baseFee: 120000, // 1200 NGN in kobo
                peakFee: 150000, // 1500 NGN in kobo
                isActive: true,
            },
            {
                name: "Inactive Zone",
                description: "Currently not served.",
                baseFee: 999999, // High fee
                peakFee: 999999,
                isActive: false,
            },
        ];

        // Insert the sample zones
        for (const zone of sampleZones) {
            await ctx.db.insert("deliveryZones", zone);
        }

        console.log(`Seeded ${sampleZones.length} delivery zones.`);
        return { success: true, message: `Seeded ${sampleZones.length} delivery zones.` };
    },
});
// --- End Seeding ---

// TODO: Add mutations for creating, updating, deleting zones via an admin interface if required.