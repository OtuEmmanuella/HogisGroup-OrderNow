"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
// Potentially import email sending utility if needed
// import { sendWelcomeEmail } from "./lib/sendEmail"; 

/**
 * Action triggered when a new user is created or signs in via Clerk webhook.
 * Stores the user in Convex if they don't exist and potentially sends a welcome email.
 */
export const handleUserCreated = action({
  args: {
    userId: v.string(), // Clerk User ID
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Webhook Action: Handling user created/signed in for Clerk User ID: ${args.userId}`);

    // 1. Check if user already exists in Convex users table (using Clerk ID)
    // Correct the property name based on the error message
    const existingUser = await ctx.runQuery(api.users.getUserByClerkId, { userId: args.userId });

    if (!existingUser) {
      console.log(`Webhook Action: User ${args.userId} not found in Convex. Creating new user.`);
      // 2. If user doesn't exist, create them
      // Use the correct mutation name (syncUser)
      await ctx.runMutation(api.users.syncUser, {
        clerkUserId: args.userId,
        email: args.email,
        name: args.name,
        // Add any other default fields for your user schema
      });
      console.log(`Webhook Action: User ${args.userId} created successfully.`);

      // 3. Optionally, send a welcome email (implement sendWelcomeEmail if needed)
      // try {
      //   await sendWelcomeEmail({ to: args.email, name: args.name });
      //   console.log(`Webhook Action: Welcome email initiated for ${args.email}`);
      // } catch (emailError) {
      //   console.error(`Webhook Action: Failed to send welcome email to ${args.email}:`, emailError);
      //   // Decide if this failure should cause the action to throw an error
      // }

    } else {
      console.log(`Webhook Action: User ${args.userId} already exists in Convex.`);
      // Optionally update user details if they've changed (e.g., name)
      // await ctx.runMutation(api.users.updateUser, { clerkId: args.userId, name: args.name });
    }

    return { success: true };
  },
});

// Add other webhook-related actions here if needed