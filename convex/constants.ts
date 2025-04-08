import { Doc } from "./_generated/dataModel";

// Time constants in milliseconds
export const DURATIONS = {
  TICKET_OFFER: 30 * 60 * 1000, // 30 minutes (Minimum Stripe allows for checkout expiry)
} as const;

// Constants related to the old ticketing system - remove or comment out

/*
export const EVENT_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
} as const;

export const WAITING_LIST_STATUS: Record<string, Doc<"waitingList">["status"]> =
  {
    WAITING: "waiting",
    OFFERED: "offered",
    EXPIRED: "expired",
    PURCHASED: "purchased",
    CANCELLED: "cancelled",
  } as const;

export const TICKET_STATUS: Record<string, Doc<"tickets">["status"]> = {
  VALID: "valid",
  USED: "used",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;
*/

// Add new constants for the fast-food app if needed below
