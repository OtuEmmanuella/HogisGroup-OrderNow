import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Assuming admin rights needed for seeding

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
// --- End Seeding ---

// TODO: Add mutations for creating, updating, deleting zones via an admin interface if required.