import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api"; // Ensure api is imported if needed later
import { Id, Doc } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Import the helper

// Define DeliveryZone type (Removed - Now in deliveryZones.ts or schema)
// export type DeliveryZone = {
//   name: string;
//   description: string;
//   baseFee: number; // Fee in kobo/cents
//   peakFee: number; // Fee in kobo/cents during peak hours
// };

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

// Query to get delivery zones for a specific branch (Removed - Use deliveryZones.listActive)
// export const getDeliveryZones = query({
//   args: { branchId: v.id("branches") },
//   handler: async (ctx, { branchId }) => {
//     const branch = await ctx.db.get(branchId);
//     if (!branch) {
//       throw new Error("Branch not found");
//     }
//     // Return the deliveryZones array from the branch document
//     // Ensure the return type matches the expected structure (array of DeliveryZone)
//     return (branch.deliveryZones as DeliveryZone[] | undefined) ?? [];
//   },
// });

// Define the shape for branch creation/update, matching schema
const branchArgs = {
  name: v.string(),
  address: v.string(),
  contactNumber: v.string(),
  operatingHours: v.string(),
  supportedOrderTypes: v.array(
    v.union(v.literal("Delivery"), v.literal("Dine-In"), v.literal("Take-out"))
  ),
  minimumOrderAmount: v.optional(v.number()),
  isActive: v.boolean(),
  // deliveryZones: v.optional(v.array( // Removed
  //   v.object({
  //     name: v.string(),
  //     description: v.string(),
  //     baseFee: v.number(),
  //     peakFee: v.number(),
  //   })
  // )), 
};

// Mutation to create a new branch
export const createBranch = mutation({
  args: branchArgs,
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    const branchId = await ctx.db.insert("branches", args);
    return branchId;
  },
});

// Mutation to update an existing branch
export const updateBranch = mutation({
  args: { branchId: v.id("branches"), ...branchArgs },
  handler: async (ctx, { branchId, ...updates }) => {
    await ensureAdmin(ctx);
    await ctx.db.patch(branchId, updates);
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
    "name" | "address" | "operatingHours" | "supportedOrderTypes" | "contactNumber" | "isActive"
    // Removed deliveryZones
>;

// --- Seeding Mutation --- 
const initialBranches: InitialBranchData[] = [
  {
    name: "Hogis Luxury Suites Branch",
    address: "7 Akim Cl, Housing Estate Rd, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm", 
    supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
    contactNumber: "+234-809-990-3335",
    isActive: true
  },
  {
    name: "Hogis Royale & Apartment Branch",
    address: "State Housing Estate, 6 Bishop Moynagh Ave, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm",   
    supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
    contactNumber: "+234-707-353-6464",
    isActive: true
  },
  {
    name: "Hogis King's Court Branch",
    address: "1 Akim Cl, Housing Estate Rd, Calabar",
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm",   
    supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
    contactNumber: "+234-913-788-0161",
    isActive: true
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
         console.log(`Branch already exists: ${branchData.name}. Checking details...`);
         let updates: Partial<InitialBranchData> = {};
         
         // Check all fields that should be updated
         if (existing.operatingHours !== branchData.operatingHours) {
           updates.operatingHours = branchData.operatingHours;
         }
         if (existing.address !== branchData.address) {
           updates.address = branchData.address;
         }
         if (!existing.contactNumber) {
           updates.contactNumber = branchData.contactNumber;
         }
         if (existing.isActive === undefined) {
           updates.isActive = branchData.isActive;
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

export const getBranchSalesAnalytics = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all branches
    const branches = await ctx.db.query("branches").collect();

    // Fetch all orders
    const orders = await ctx.db.query("orders").collect();

    // Calculate sales per branch
    const branchSales = branches.map((branch) => {
      const branchOrders = orders.filter((order) => order.branchId === branch._id);
      const totalSales = branchOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      return {
        branchId: branch._id,
        branchName: branch.name,
        totalSales: totalSales / 100, // Convert from kobo/cents to Naira/Dollars
      };
    });

    return branchSales;
  },
});