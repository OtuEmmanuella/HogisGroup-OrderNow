'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils"; // Assuming you have a price formatter

interface DeliveryZoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectZone: (zoneId: Id<"deliveryZones">) => Promise<void>; // Make async to handle mutation
  isLoading: boolean; // To disable button during mutation
}

export default function DeliveryZoneSelectorModal({
  isOpen,
  onClose,
  onSelectZone,
  isLoading,
}: DeliveryZoneSelectorModalProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<Id<"deliveryZones"> | null>(null);
  const activeZones = useQuery(api.deliveryZones.getActiveDeliveryZones);

  const handleSelect = async () => {
    if (!selectedZoneId) {
      toast.warning("Please select a delivery zone.");
      return;
    }
    try {
      await onSelectZone(selectedZoneId); 
      // Don't close automatically, let the parent handle it on success
    } catch (error) {
      // Error handled by parent via toast
      console.error("Error selecting zone:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Delivery Zone</DialogTitle>
          <DialogDescription>
            Choose the delivery location for this order. Fees may apply based on the zone and time.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {!activeZones ? (
            <p>Loading zones...</p>
          ) : activeZones.length === 0 ? (
            <p>No delivery zones are currently available.</p>
          ) : (
            <RadioGroup
              value={selectedZoneId ?? undefined}
              onValueChange={(value) => setSelectedZoneId(value as Id<"deliveryZones">)}
            >
              {activeZones.map((zone) => (
                <div key={zone._id} className="flex items-center space-x-2 border p-3 rounded-md">
                  <RadioGroupItem value={zone._id} id={zone._id} />
                  <Label htmlFor={zone._id} className="flex flex-col flex-grow cursor-pointer">
                    <span className="font-medium">{zone.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {zone.description} - Base: {formatPrice(zone.baseFee)}, Peak: {formatPrice(zone.peakFee)}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedZoneId || isLoading || !activeZones || activeZones.length === 0}
          >
            {isLoading ? "Saving..." : "Confirm Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 