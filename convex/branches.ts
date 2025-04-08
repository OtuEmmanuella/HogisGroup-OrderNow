import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api"; // Ensure api is imported if needed later
import { Id, Doc } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Import the helper

// Query to list all available branches
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all documents from the 'branches' table
    const branches = await ctx.db.query("branches").collect();
    return branches;
  },
});

// Query to get a single branch by ID
export const getById = query({
  args: { branchId: v.id("branches") },
  handler: async (ctx, { branchId }) => {
    return await ctx.db.get(branchId);
  },
});

// Define the shape for branch creation/update, matching schema
const branchArgs = {
  name: v.string(),
  address: v.string(),
  operatingHours: v.string(),
  supportedOrderTypes: v.array(
    v.union(v.literal("Delivery"), v.literal("Dine-In"), v.literal("Take-out"))
  ),
  deliveryZone: v.optional(v.any()), // Expecting GeoJSON structure
};

// Mutation to create a new branch
export const createBranch = mutation({
  args: branchArgs,
  handler: async (ctx, args) => {
    await ensureAdmin(ctx); // <-- Add auth check
    const branchId = await ctx.db.insert("branches", args);
    return branchId;
  },
});

// Mutation to update an existing branch
export const updateBranch = mutation({
  args: { branchId: v.id("branches"), ...branchArgs },
  handler: async (ctx, { branchId, ...updates }) => {
    await ensureAdmin(ctx); // <-- Add auth check
    const existingBranch = await ctx.db.get(branchId);
    if (!existingBranch) {
      throw new Error("Branch not found");
    }
    await ctx.db.patch(branchId, updates);
    return branchId;
  },
});

// Optional: Mutation to delete a branch (consider soft delete)
export const deleteBranch = mutation({
    args: { branchId: v.id("branches") },
    handler: async (ctx, { branchId }) => {
        await ensureAdmin(ctx); // <-- Add auth check
        const existingBranch = await ctx.db.get(branchId);
        if (!existingBranch) {
          throw new Error("Branch not found");
        }
        await ctx.db.delete(branchId);
    },
});

// Optional: Add mutations for creating/updating branches if needed via admin panel 

// Define a type for the initial branch data matching insert requirements
type InitialBranchData = Pick<Doc<"branches">, 
    "name" | "address" | "operatingHours" | "supportedOrderTypes"
>;

// --- Seeding Mutation --- 
const initialBranches: InitialBranchData[] = [
  {
    name: "Hogis Luxury Suites Branch",
    address: "7 Akim Cl, Housing Estate Rd, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm", 
    supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
  },
  {
    name: "Hogis Royale & Apartment Branch",
    address: "State Housing Estate, 6 Bishop Moynagh Ave, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm",   
    supportedOrderTypes: ["Delivery", "Take-out"], 
  },
  {
    name: "Hogis Exclusive Suites Branch",
    address: "E1 Estate Lemna Rd, Atekong, Calabar", // Adjusted slightly for clarity 
    operatingHours: "Dine-In/Take-out: 24 Hours",      
    supportedOrderTypes: ["Dine-In", "Take-out"], 
  },
];

// One-off mutation to seed initial data
export const seedInitialBranches = mutation({
  args: {}, 
  handler: async (ctx) => {
    // IMPORTANT: Add auth check if you don't want just anyone running this
    // await ensureAdmin(ctx);

    console.log("Attempting to seed initial branches...");
    let branchesAdded = 0;

    for (const branchData of initialBranches) {
      const existing = await ctx.db
        .query("branches")
        .filter((q) => q.eq(q.field("name"), branchData.name))
        .first();

      if (!existing) {
        await ctx.db.insert("branches", branchData);
        branchesAdded++;
        console.log(`Added branch: ${branchData.name}`);
      } else {
         console.log(`Branch already exists: ${branchData.name}. Checking hours and address...`);
         let updates: Partial<InitialBranchData> = {};
         if (existing.operatingHours !== branchData.operatingHours) {
           updates.operatingHours = branchData.operatingHours;
         }
         if (existing.address !== branchData.address) {
           updates.address = branchData.address;
         }
         
         if (Object.keys(updates).length > 0) {
             await ctx.db.patch(existing._id, updates);
             console.log(`Updated details for branch: ${branchData.name}`);
         } else {
             console.log(`Details are already up-to-date for ${branchData.name}.`);
         }
      }
    }
    console.log(`Seeding complete. Added ${branchesAdded} new branches.`);
    return { branchesAdded };
  },
});
// --- End Seeding --- 