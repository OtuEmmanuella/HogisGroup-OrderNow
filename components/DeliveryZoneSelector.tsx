'use client';

import React from 'react';
import { useQuery } from 'convex/react'; // Import useQuery
import { api } from '@/convex/_generated/api'; // Import api
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Doc, Id } from '@/convex/_generated/dataModel'; // Import Id
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Use the Doc type directly from dataModel
type DeliveryZone = Doc<"deliveryZones">;

interface DeliveryZoneSelectorProps {
  // deliveryZones: DeliveryZone[]; // Removed: Fetch inside component
  selectedZoneId?: Id<"deliveryZones">; // Use Id type
  isPeakHour?: boolean;
  onZoneSelect: (zone: DeliveryZone) => void; // Pass the full zone object back
}

export default function DeliveryZoneSelector({
  // deliveryZones, // Removed
  selectedZoneId,
  isPeakHour = false,
  onZoneSelect,
}: DeliveryZoneSelectorProps) {
  // Fetch active delivery zones
  const deliveryZones = useQuery(api.deliveryZones.listActive);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount / 100);
  };

  // Handle loading state
  if (deliveryZones === undefined) {
    return (
      <div className="space-y-4">
        <Label className="text-base font-semibold">Select Your Delivery Zone</Label>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border">
              <Skeleton className="h-5 w-5 rounded-full mt-1" />
              <div className="flex-grow space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle empty state (optional, maybe show a message)
  if (deliveryZones.length === 0) {
    return (
      <div className="space-y-2 p-3 rounded-lg border text-center text-muted-foreground">
        No delivery zones are currently available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Select Your Delivery Zone</Label>
      <RadioGroup
        value={selectedZoneId} // Use selectedZoneId for the value
        onValueChange={(zoneId) => { // The value received is now the ID
          const zone = deliveryZones.find(z => z._id === zoneId);
          if (zone) onZoneSelect(zone); // Pass the full zone object
        }}
      >
        <div className="space-y-2">
          {deliveryZones.map((zone) => (
            <div key={zone._id} className="flex items-start space-x-3 p-3 rounded-lg border"> {/* Use _id as key */}
              <RadioGroupItem value={zone._id} id={zone._id} className="mt-1" /> {/* Use _id as value and id */}
              <Label htmlFor={zone._id} className="flex-grow cursor-pointer"> {/* Use _id for htmlFor */}
                <div className="font-medium">{zone.name}</div>
                <div className="text-sm text-muted-foreground">{zone.description}</div>
                <div className="text-sm mt-1">
                  Delivery Fee: {formatPrice(isPeakHour ? zone.peakFee : zone.baseFee)}
                  {isPeakHour && (
                    <span className="text-yellow-600 ml-2">(Peak hour pricing)</span>
                  )}
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}