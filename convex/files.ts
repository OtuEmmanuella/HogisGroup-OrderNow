import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { ensureAdmin } from "./lib/auth"; // Import auth helper

// Generate a short-lived upload URL for the client to upload a file directly to
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // TODO: Add authentication checks if needed
    // Example: Check if user is admin before allowing upload
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");
    // const user = await ctx.runQuery(api.users.getUserByClerkId, { userId: identity.subject });
    // if (user?.role !== 'admin') throw new Error("Unauthorized");

    return await ctx.storage.generateUploadUrl();
  },
});

// Get the URL for a stored file by its storage ID
export const getUrl = query({
    args: { storageId: v.optional(v.id("_storage")) },
    handler: async (ctx, { storageId }) => {
        if (!storageId) {
            return null;
        }
        try {
            // Use Convex built-in function to get file URL
            return await ctx.storage.getUrl(storageId);
        } catch (error) {
            // Handle potential errors like invalid storageId or deleted file
            console.error(`Failed to get URL for storage ID ${storageId}:`, error);
            return null;
        }
    },
});

// Mutation to delete a file from storage
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ensureAdmin(ctx); // Ensure only admins can delete files via this mutation
    try {
        await ctx.storage.delete(storageId);
        console.log(`Deleted file with storage ID: ${storageId}`);
    } catch (error) {
        console.error(`Failed to delete file ${storageId}:`, error);
        // Decide if you want to throw the error or just log it
        // throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
}); 