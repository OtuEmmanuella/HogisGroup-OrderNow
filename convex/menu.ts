import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel"; // Import Id and Doc
import { ensureAdmin } from "./lib/auth"; // Import the helper

// Renamed from getCategoriesByBranch - Fetches all categories (now global)
export const getAllCategories = query({
  args: {}, // No arguments needed now
  handler: async (ctx) => {
    // Fetch all categories, no branch filtering
    return await ctx.db
      .query("menuCategories")
      // Removed: .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .collect();
  },
});

// Renamed from getEventById
export const getCategoryById = query({
  args: { categoryId: v.id("menuCategories") },
  handler: async (ctx, { categoryId }) => {
    return await ctx.db.get(categoryId);
  },
});

// Renamed from createEvent
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx); // Ensure only admins can create
    const categoryId = await ctx.db.insert("menuCategories", {
      ...args,
      isActive: true, // Default new categories to active
    });
    return categoryId;
  },
});

// Create a new menu item
export const createMenuItem = mutation({
  args: {
    categoryId: v.id("menuCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    // Validate price
    if (args.price < 0) {
      throw new Error("Price cannot be negative.");
    }

    // Check if category exists
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Menu category not found");
    }

    console.log(`Creating menu item '${args.name}' in category ${args.categoryId}`);
    const menuItemId = await ctx.db.insert("menuItems", {
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      price: args.price,
      imageUrl: args.imageUrl,
      // Removed: branchId: category.branchId, // Items are global now
      isAvailable: args.isAvailable ?? true,
    });
    console.log(`Menu item created with ID: ${menuItemId}`);
    return menuItemId;
  },
});

// New function to get items for a category
export const getItemsByCategory = query({
  args: { categoryId: v.id("menuCategories") },
  handler: async (ctx, { categoryId }) => {
    return await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .collect();
  },
});

// Renamed from updateEventImage - Now updates MenuItem image
export const updateMenuItemImage = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    imageUrl: v.string(), // Expect a URL string now
  },
  handler: async (ctx, { menuItemId, imageUrl }) => {
    await ensureAdmin(ctx); // <-- Add auth check

    const menuItem = await ctx.db.get(menuItemId);
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Removed: Validation logic tied to branchId needs rethinking if necessary
    // // Validate access here based on menuItem.categoryId -> category.branchId

    // Update with imageUrl instead of imageStorageId
    await ctx.db.patch(menuItemId, { imageUrl }); // Use imageUrl here
  },
});

// Mutation to update a menu category
export const updateCategory = mutation({
  args: {
    categoryId: v.id("menuCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()), // Allow updating isActive
  },
  handler: async (ctx, { categoryId, ...updates }) => {
    await ensureAdmin(ctx);
    await ctx.db.patch(categoryId, updates);
  },
});

// Define a type for the fields that can be updated in a menuItem
// Exclude _id and _creationTime as they are not patchable
// Ensure this type uses imageUrl and not imageStorageId
type MenuItemPatchData = Partial<Omit<Doc<"menuItems">, "_id" | "_creationTime">>;

// Update an existing menu item
export const updateMenuItem = mutation({
    args: {
        menuItemId: v.id("menuItems"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        // imageStorageId: v.optional(v.id("_storage")), // This reference might still be causing issues if not fully removed previously
        imageUrl: v.optional(v.string()), // Ensure only imageUrl is here
        categoryId: v.optional(v.id("menuCategories")),
        isAvailable: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await ensureAdmin(ctx);

        const { menuItemId, ...updates } = args;

        // Validate price if provided
        if (updates.price !== undefined && updates.price < 0) {
            throw new Error("Price cannot be negative.");
        }

        // Prepare the final updates object with the correct type
        const cleanedUpdates: MenuItemPatchData = {}; 
        for (const [key, value] of Object.entries(updates)) {
            // Ensure we are not trying to add imageStorageId or branchId here
            if (value !== undefined && key !== 'branchId' && key !== 'imageStorageId') {
                (cleanedUpdates as any)[key] = value;
            }
        }

        // Ensure we don't accidentally try to patch imageStorageId if it lingered in updates somehow
        // This check might be redundant now but kept for safety
        if ('imageStorageId' in cleanedUpdates) {
            delete (cleanedUpdates as any).imageStorageId;
        }

        // Removed: Logic to update branchId based on category change
        /*
        // Check if category is being updated, and if so, update branchId too
        if (updates.categoryId) {
            const newCategory = await ctx.db.get(updates.categoryId);
            if (!newCategory) {
                throw new Error("New menu category not found");
            }
            // This logic is no longer valid as items don't have branchId
            // cleanedUpdates.branchId = newCategory.branchId;
        }
        */

        if (Object.keys(cleanedUpdates).length === 0) {
             console.warn("Update menu item called with no changes.");
             return; // No updates to perform
        }

        console.log(`Updating menu item ${menuItemId} with:`, cleanedUpdates);
        await ctx.db.patch(menuItemId, cleanedUpdates);
        console.log(`Menu item ${menuItemId} updated.`);
    },
});

// Renamed from cancelEvent - Now deletes a category
// Consider adding soft delete later (e.g., is_deleted flag)
export const deleteCategory = mutation({
  args: { categoryId: v.id("menuCategories") },
  handler: async (ctx, { categoryId }) => {
    await ensureAdmin(ctx); // <-- Add auth check

    // Optional: Check if category has items before deleting?
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
      .collect();

    if (items.length > 0) {
       throw new Error("Cannot delete category with existing menu items. Please delete items first.");
    }

    const category = await ctx.db.get(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Removed: Validation logic tied to branchId needs rethinking if necessary
    // // Validate access here based on category.branchId

    // No need to delete items separately if check above is enforced
    /*
    // Delete items first
    const itemsToDelete = await ctx.db.query("menuItems").withIndex("by_category", q => q.eq("categoryId", categoryId)).collect();
    await Promise.all(itemsToDelete.map(async (item) => {
        await ctx.db.delete(item._id);
    }));
    */
    // Delete category itself
    await ctx.db.delete(categoryId);
  },
});

// New mutation to delete a menu item
export const deleteMenuItem = mutation({
    args: { menuItemId: v.id("menuItems") },
    handler: async (ctx, { menuItemId }) => {
        await ensureAdmin(ctx); // <-- Add auth check
        const existingItem = await ctx.db.get(menuItemId);
        if (!existingItem) {
            throw new Error("Menu item not found");
        }

        // Removed: Validation logic tied to branchId needs rethinking if necessary

        // REMOVED - No longer using Convex storage
        /*
        if (existingItem.imageStorageId) {
            try {
                await ctx.storage.delete(existingItem.imageStorageId);
            } catch (error) {
                console.warn(`Failed to delete image storage ${existingItem.imageStorageId} for item ${menuItemId}:`, error)
            }
        }
        */
        await ctx.db.delete(menuItemId);
    },
});

// Query to search menu items
export const searchMenuItems = query({
  args: {
    query: v.string(),
    categoryId: v.optional(v.id("menuCategories")),
    // branchId: v.optional(v.id("branches")), // Removed branchId filter
    availabilityFilter: v.optional(v.boolean()), // Optional filter by availability
  },
  handler: async (ctx, { query: searchQuery, categoryId, availabilityFilter }) => {
    // Start a search query on the 'menuItems' table using the 'search_name_description' index
    let queryBuilder = ctx.db
      .query("menuItems")
      .withSearchIndex("search_name_description", (q) =>
        q.search("name", searchQuery) // Search within the 'name' field
        // To search description too, use: q.search("name", searchQuery).search("description", searchQuery)
        // Or ensure the index definition includes description in searchField: ["name", "description"]
      );

    // Apply filters based on arguments provided
    const filters: ((q: any) => any)[] = []; // Use 'any' for simplicity, refine if needed

    if (categoryId) {
      filters.push((q) => q.eq("categoryId", categoryId));
    }
    if (availabilityFilter !== undefined) {
        filters.push((q) => q.eq("isAvailable", availabilityFilter));
    }
    // Removed branchId filter
    // if (branchId) {
    //     filters.push((q) => q.eq("branchId", branchId));
    // }

    // Apply all collected filters if any
    if (filters.length > 0) {
        queryBuilder = queryBuilder.filter((q) => {
            // Combine filters using AND logic (each must be true)
            let combinedFilter = filters[0](q);
            for (let i = 1; i < filters.length; i++) {
                combinedFilter = q.and(combinedFilter, filters[i](q));
            }
            return combinedFilter;
        });
    }

    // Execute the query and return results
    return await queryBuilder.collect();
  },
});


// Query to get menu items, possibly filtered by category and branch
// This function needs significant changes or replacement
export const getMenuItems = query({
    args: {
        categoryId: v.optional(v.id("menuCategories")),
        includeUnavailable: v.optional(v.boolean()) // Add option to include unavailable items
    },
    handler: async (ctx, { categoryId, includeUnavailable }) => {
        // Defensive: If categoryId is present but invalid, return []
        if (categoryId === undefined || categoryId === null) {
            return [];
        }

        // If filtering by category AND availability, use the combined index
        if (categoryId && !includeUnavailable) {
            const results = await ctx.db
                .query("menuItems")
                .withIndex("by_category_availability", (q) => 
                    q.eq("categoryId", categoryId).eq("isAvailable", true)
                )
                .collect();
            return results;
        }

        // If filtering only by category
        if (categoryId && includeUnavailable) {
            const results = await ctx.db
                .query("menuItems")
                .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
                .collect();
            return results;
        }

        // If filtering only by availability (fetching all available items globally)
        if (!categoryId && !includeUnavailable) {
            const results = await ctx.db
                .query("menuItems")
                .withIndex("by_availability", (q) => q.eq("isAvailable", true))
                .collect();
            return results;
        }

        // If fetching ALL items (no category filter, include unavailable)
        if (!categoryId && includeUnavailable) {
             console.warn("Fetching all menu items globally. This could be a large query.");
             const results = await ctx.db.query("menuItems").collect();
             return results;
        }

        // Fallback/default case (should logically be covered above, but good practice)
        console.warn("getMenuItems: Unhandled case, fetching all items.");
        return await ctx.db.query("menuItems").collect();
    },
});


// --- Helper to get full menu details (categories with items) ---
export const getFullMenu = query({
    args: {
        // branchId: v.id("branches"), // Remove branchId requirement
        includeUnavailableItems: v.optional(v.boolean()), // Option to show unavailable items
    },
    handler: async (ctx, { includeUnavailableItems }) => {
        // 1. Fetch all categories (since they are global now)
        const categories = await ctx.db.query("menuCategories").collect();

        // 2. Fetch all menu items (or filter by availability globally)
        let itemsQuery = ctx.db.query("menuItems");
        if (!includeUnavailableItems) {
            // Requires filtering or an index on isAvailable
            // Add .index("by_availability", ["isAvailable"]) to schema for efficiency
             itemsQuery = itemsQuery.filter((q) => q.eq(q.field("isAvailable"), true));
             console.warn("Filtering all menu items by availability without an index.");
        }
        const allItems = await itemsQuery.collect();


        // 3. Group items by categoryId
        const itemsByCategory = new Map<Id<"menuCategories">, Doc<"menuItems">[]>();
        for (const item of allItems) {
            const categoryItems = itemsByCategory.get(item.categoryId) || [];
            categoryItems.push(item);
            itemsByCategory.set(item.categoryId, categoryItems);
        }

        // 4. Combine categories with their items
        const fullMenu = categories.map((category) => ({
            ...category,
            items: itemsByCategory.get(category._id) || [],
        }));

        return fullMenu;
  },
});

// --- Seeding Mutation ---

// Removed branch-specific helper functions as menu is now global
/*
async function seedCategoriesForBranch(...) { ... }
async function seedItemsForBranchCategories(...) { ... }
*/

// One-off mutation to seed sample GLOBAL menu categories and items
export const seedSampleMenu = mutation({
  args: {}, 
  handler: async (ctx) => {
    // IMPORTANT: Add auth check if this should be restricted
    // await ensureAdmin(ctx);

    console.log("Starting database seed for global menu...");

    // 1. Seed Global Categories
    const categoriesToSeed = [
        { name: "Appetizers", description: "Start your meal with these delicious bites.", displayOrder: 1, isActive: true },
        { name: "Main Courses", description: "Hearty and satisfying main dishes.", displayOrder: 2, isActive: true },
        { name: "Desserts", description: "Sweet treats to end your meal.", displayOrder: 3, isActive: true },
        { name: "Drinks", description: "Refreshing beverages.", displayOrder: 4, isActive: true },
    ];
    
    const categoryIds: { [key: string]: Id<"menuCategories"> } = {};
    console.log("Seeding categories...");
    for (const catData of categoriesToSeed) {
        // Check if category already exists by name (globally)
        const existing = await ctx.db
        .query("menuCategories")
            .filter((q) => q.eq(q.field("name"), catData.name))
        .first();

        if (!existing) {
            const newId = await ctx.db.insert("menuCategories", catData); // Insert without branchId
            categoryIds[catData.name] = newId;
            console.log(`  Added category: ${catData.name}`);
        } else {
            categoryIds[catData.name] = existing._id;
            console.log(`  Category already exists: ${catData.name}`);
        }
    }

    // 2. Seed Global Menu Items
    const itemsToSeed = [
        { name: "Spring Rolls", description: "Crispy vegetable spring rolls.", price: 599, categoryName: "Appetizers", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" }, // Use Kobo/Cents
        { name: "Chicken Wings", description: "Spicy or BBQ chicken wings.", price: 849, categoryName: "Appetizers", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Jollof Rice with Chicken", description: "Classic Nigerian Jollof rice served with grilled chicken.", price: 1599, categoryName: "Main Courses", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Egusi Soup with Pounded Yam", description: "Rich melon seed soup with assorted meat, served with pounded yam.", price: 1899, categoryName: "Main Courses", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Grilled Tilapia", description: "Whole tilapia fish grilled with spices, served with plantain.", price: 2250, categoryName: "Main Courses", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Puff Puff", description: "Sweet Nigerian doughnuts.", price: 450, categoryName: "Desserts", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Chocolate Lava Cake", description: "Warm chocolate cake with a molten center.", price: 799, categoryName: "Desserts", isAvailable: false, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" }, // Example unavailable item
        { name: "Chapman", description: "Classic Nigerian fruit punch.", price: 399, categoryName: "Drinks", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
        { name: "Water", description: "Bottled still water.", price: 150, categoryName: "Drinks", isAvailable: true, imageUrl: "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/sample.jpg" },
    ];

    let itemsAddedCount = 0;
    console.log("Seeding menu items...");
    for (const itemData of itemsToSeed) {
        const categoryId = categoryIds[itemData.categoryName];
        if (!categoryId) {
            console.warn(`  Skipping item '${itemData.name}': Category '${itemData.categoryName}' ID not found.`);
            continue;
        }

        // Check if item already exists by name within this category (globally)
        const existing = await ctx.db
          .query("menuItems")
            .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
            .filter((q) => q.eq(q.field("name"), itemData.name))
          .first();

        if (!existing) {
            const { categoryName, ...dataToInsert } = itemData; // Exclude categoryName
            await ctx.db.insert("menuItems", {
                ...dataToInsert,
                categoryId: categoryId,
                // Removed: branchId: branchId, // No branchId needed
                // isAvailable is already in itemData
            });
            itemsAddedCount++;
            console.log(`    Added item: ${itemData.name}`);
        } else {
            console.log(`    Item already exists: ${itemData.name}`);
        }
    }

    console.log(`Seed finished. Added ${Object.keys(categoryIds).length} categories (or found existing) and ${itemsAddedCount} new items.`);
    return { categoriesAdded: Object.keys(categoryIds).length, itemsAdded: itemsAddedCount };
  },
});

// --- Example Admin-Only Query ---
// You might have admin-specific functions, ensure they use ensureAdmin()
export const getAdminDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        await ensureAdmin(ctx);
        // Example: Fetch counts (adjust as needed)
        const totalOrders = await ctx.db.query("orders").collect();
        const totalMenuItems = await ctx.db.query("menuItems").collect();
        // ... add more stats
        return {
            orderCount: totalOrders.length,
            menuItemCount: totalMenuItems.length,
            // ... 
        };
    },
});

// --- Migration --- 

// Obsolete migration removed - branchId is no longer part of menuItems or menuCategories schema
/*
export const migrateMenuItemsAddBranchId = mutation({
    args: {},
    handler: async (ctx) => {
        // ... (entire function body) ...
    },
});
*/

// --- End Migration ---

// Removed: checkAvailability, joinWaitingList, purchaseTicket,
// calculateEventMetrics, getEventsByUser, getUserMetrics
// Removed related imports: ConvexError, DURATIONS, WAITING_LIST_STATUS, TICKET_STATUS,
// internal, processQueue, RateLimiter, MINUTE

// Internal mutation for seeding
export const seedMenuData = internalMutation(async (ctx) => {
  // ... check if data exists ...
  console.log("Seeding menu categories...");
  const categoriesToSeed: Omit<Doc<"menuCategories">, "_id" | "_creationTime">[] = [
    { name: "Appetizers", displayOrder: 1, isActive: true }, // Added isActive
    { name: "Main Courses", displayOrder: 2, isActive: true }, // Added isActive
    { name: "Desserts", displayOrder: 3, isActive: true }, // Added isActive
    { name: "Drinks", displayOrder: 4, isActive: true }, // Added isActive
  ];
  const categoryIds: Record<string, Id<"menuCategories">> = {};
  for (const category of categoriesToSeed) {
    const id = await ctx.db.insert("menuCategories", category);
    categoryIds[category.name] = id;
  }
  // ... seed menu items using categoryIds ...
});