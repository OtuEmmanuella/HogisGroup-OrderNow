import { v } from "convex/values";
import { Webhook } from "svix";
import { internalAction, internalMutation } from "./_generated/server";
import { WebhookEvent } from "@clerk/clerk-sdk-node";

// Define an internal mutation to create or update the user in the Convex database
export const fulfillUserWebhook = internalMutation({
  args: { headers: v.any(), payload: v.string() },
  handler: async (ctx, { headers, payload }) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!); // Ensure CLERK_WEBHOOK_SECRET is set in Convex Dashboard

    let evt: WebhookEvent;
    try {
      evt = wh.verify(payload, headers) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying Clerk webhook:", err);
      // Throwing an error here will cause Convex to retry the mutation.
      // Consider if you want retries for verification errors.
      throw new Error("Clerk webhook verification failed");
    }

    const { id, ...attributes } = evt.data;
    const eventType = evt.type;

    switch (eventType) {
      case "user.created":
        if (!id) {
          console.error("Clerk webhook error: Missing user ID in user.created event.");
          return; // Cannot proceed without an ID
        }
        // Check if user already exists (e.g., if webhook retried)
        const existingUser = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", id)) // Use correct index and field
          .unique();

        if (existingUser) {
          console.log(`User ${id} already exists, skipping creation.`);
          return; // Or potentially update if needed
        }

        // Create the user
        // Log the raw attributes received from Clerk
        console.log("Raw Clerk user.created attributes:", attributes);
 
        // Cast attributes to any to bypass strict type checking for now
        const userAttributes = attributes as any;

        // Ensure email is provided, fallback to a placeholder if necessary, or throw error
        const email = userAttributes.email_addresses?.[0]?.email_address;
        if (!email) {
           console.error(`Clerk webhook error: Missing email for created user ${id}.`);
           // Decide how to handle: throw error, use placeholder, etc.
           // Using placeholder for now, but review if email is truly optional
           // throw new Error(`Missing email for created user ${id}`);
           // return; // Or skip creation
        }

        await ctx.db.insert("users", {
          userId: id, // Use correct field name 'userId'
          email: email || `missing_email_${id}@example.com`, // Provide a fallback or handle error above
          name: `${userAttributes.first_name ?? ""} ${userAttributes.last_name ?? ""}`.trim(), // Access via casted variable
          imageUrl: userAttributes.image_url, // Add imageUrl
          credits: 0, // Initialize credits to 0
          role: 'customer', // Default role
        });
        console.log(`Created user ${id}`);
        break;

      case "user.updated":
        if (!id) {
          console.error("Clerk webhook error: Missing user ID in user.updated event.");
          return; // Cannot proceed without an ID
        }
        // Find the user by Clerk ID
        const userToUpdate = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", id)) // Use correct index and field
          .unique();

        if (!userToUpdate) {
          console.warn(`User ${id} not found for update.`);
          // Optionally, create the user if they don't exist (upsert logic)
          // await ctx.db.insert("users", { ... });
          return;
        }

        // Log the raw attributes received from Clerk
        console.log("Raw Clerk user.updated attributes:", attributes);

        // Cast attributes to any to bypass strict type checking for now
        const updatedAttributes = attributes as any;

        // Update the user
        // Ensure email is provided if updating, handle potential undefined
        const updatedEmail = updatedAttributes.email_addresses?.[0]?.email_address;

        await ctx.db.patch(userToUpdate._id, {
          // Only update email if a new one is provided in the webhook
          ...(updatedEmail && { email: updatedEmail }),
          name: `${updatedAttributes.first_name ?? ""} ${updatedAttributes.last_name ?? ""}`.trim(),
          imageUrl: updatedAttributes.image_url, // Add imageUrl update
          credits: 0, // Don't reset credits on update unless intended
        });
        console.log(`Updated user ${id}`);
        break;

      case "user.deleted":
         if (!id) {
          console.error("Clerk webhook error: Missing user ID in user.deleted event.");
          return; // Cannot proceed without an ID
        }
        // Find the user by Clerk ID
         const userToDelete = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", id)) // Use correct index and field
          .unique();

        if (!userToDelete) {
          console.warn(`User ${id} not found for deletion.`);
          return;
        }
        // Consider what should happen to related data (orders, cart memberships, etc.)
        // This might require more complex logic or cascading deletes if your schema supports it.
        // For now, just delete the user record.
        await ctx.db.delete(userToDelete._id);
        console.log(`Deleted user ${id}`);
        break;

      default:
        console.log(`Ignoring Clerk webhook event type: ${eventType}`);
    }
  },
});

// Optional: Define an action if you need Node.js capabilities before the mutation
// (e.g., complex validation, external API calls not related to the core DB update)
// export const handleClerkWebhookAction = internalAction({...});

export const createUserInternal = internalMutation({
    args: {
        userId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    },
    handler: async (ctx, { userId, email, name, imageUrl, role }) => {
        await ctx.db.insert("users", {
            userId,
            email,
            name: name ?? "",
            imageUrl,
            credits: 0,
            role: role ?? "customer", // Default to customer instead of member
        });
    },
});