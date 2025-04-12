import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Remove the obsolete cron job definition
/*
crons.interval(
  "cleanup-expired-offers",
  { minutes: 1 }, // Run every 1 minute
  internal.waitingList.cleanupExpiredOffers
);
*/

// Schedule the shared cart expiration job to run every hour
crons.interval(
  "expire-old-shared-carts",
  { hours: 1 }, // Run every hour
  internal.sharedCarts.expireOldSharedCarts // Reference the internal mutation we created
);


// If no other crons are defined, this file might become empty
// except for the imports and export. That's okay.

export default crons;
