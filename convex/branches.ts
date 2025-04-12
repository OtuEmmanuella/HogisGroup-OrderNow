import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
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
  contactNumber: v.string(),
  operatingHours: v.string(),
  supportedOrderTypes: v.array(
    v.union(v.literal("Delivery"), v.literal("Dine-In"), v.literal("Take-out"))
  ),
  deliveryZone: v.optional(v.any()), // Expecting GeoJSON structure
  minimumOrderAmount: v.optional(v.number()),
  deliveryFee: v.optional(v.number()),
  isActive: v.boolean(),
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
>;

// --- Seeding Mutation --- 
const initialBranches: InitialBranchData[] = [
  {
    name: "Hogis Luxury Suites Branch",
    address: "7 Akim Cl, Housing Estate Rd, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm", 
    supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
    contactNumber: "+234-123-456-7890",
    isActive: true
  },
  {
    name: "Hogis Royale & Apartment Branch",
    address: "State Housing Estate, 6 Bishop Moynagh Ave, Calabar", 
    operatingHours: "Dine-In/Take-out: 24 Hours; Delivery: Daily until 9pm",   
    supportedOrderTypes: ["Delivery", "Take-out"],
    contactNumber: "+234-123-456-7891",
    isActive: true
  },
  {
    name: "Hogis Exclusive Suites Branch",
    address: "E1 Estate Lemna Rd, Atekong, Calabar",
    operatingHours: "Dine-In/Take-out: 24 Hours",      
    supportedOrderTypes: ["Dine-In", "Take-out"],
    contactNumber: "+234-123-456-7892",
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

// Internal mutation to seed initial data (if needed)
export const seedInitialData = internalMutation(
    async (ctx: MutationCtx) => {
        // Check if data already exists to prevent re-seeding
        const existingBranches = await ctx.db.query("branches").collect();
        if (existingBranches.length > 0) {
            console.log("Branch data already seeded.");
            return;
        }

        console.log("Seeding initial branch data...");
        const initialBranches: Omit<Doc<"branches">, "_id" | "_creationTime">[] = [
            {
                name: "Hogis Main",
                address: "123 Hogis Way, Calabar",
                contactNumber: "+2348000000001",
                operatingHours: "9:00 AM - 10:00 PM Daily",
                supportedOrderTypes: ["Delivery", "Dine-In", "Take-out"],
                isActive: true,
                minimumOrderAmount: 150000,
                deliveryFee: 50000,
                deliveryZone: {},
            },
            {
                name: "Hogis Express",
                address: "456 Express Ln, Calabar",
                contactNumber: "+2348000000002",
                operatingHours: "10:00 AM - 8:00 PM Mon-Sat",
                supportedOrderTypes: ["Take-out"],
                isActive: true,
                minimumOrderAmount: 100000,
                deliveryFee: undefined,
                deliveryZone: undefined,
            },
        ];

        for (const branchData of initialBranches) {
            await ctx.db.insert("branches", branchData);
        }
        console.log(`Seeded ${initialBranches.length} branches.`);
    }
);