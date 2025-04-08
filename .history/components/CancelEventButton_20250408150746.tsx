"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { refundPaystackTransaction } from "@/app/actions/refundPaystackTransaction";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function CancelEventButton({
  eventId,
}: {
  eventId: Id<"events">;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this event? All tickets will be refunded via Paystack and the event will be cancelled permanently."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await refundPaystackTransaction(eventId);
      
      toast({
        title: "Event Cancellation Initiated",
        description: result.message || "Event cancelled and refunds processed successfully.",
      });
      router.refresh();

    } catch (error: unknown) {
      console.error("Failed to cancel event:", error);
      toast({
        variant: "destructive",
        title: "Cancellation Error",
        description: error instanceof Error ? error.message : "Failed to cancel event. Check logs or Paystack dashboard.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
    >
      <Ban className="w-4 h-4" />
      <span>{isCancelling ? "Processing Refunds..." : "Cancel & Refund Event"}</span>
    </button>
  );
}
