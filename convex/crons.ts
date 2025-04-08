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

// If no other crons are defined, this file might become empty 
// except for the imports and export. That's okay.

export default crons;
