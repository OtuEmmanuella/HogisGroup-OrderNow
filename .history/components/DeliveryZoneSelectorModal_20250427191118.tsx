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
import { Input } from "@/components/ui/input"; // Import Input

// Define the data passed back on selection
interface DeliverySelectionData {
  zoneId: Id<"deliveryZones">;
  streetAddress: string;
  phoneNumber: string;
}

interface DeliveryZoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Update prop type to accept DeliverySelectionData
  onSelectZone: (data: DeliverySelectionData) => Promise<void>; 
  isLoading: boolean; 
}

export default function DeliveryZoneSelectorModal({
  isOpen,
  onClose,
  onSelectZone,
  isLoading,
}: DeliveryZoneSelectorModalProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<Id<"deliveryZones"> | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const activeZones = useQuery(api.deliveryZones.getActiveDeliveryZones);

  const handleSelect = async () => {
    if (!selectedZoneId) {
      toast.warning("Please select a delivery zone.");
      return;
    }
    if (!streetAddress.trim()) {
        toast.warning("Please enter a street address.");
        return;
    }
    if (!phoneNumber.trim()) {
        toast.warning("Please enter a phone number.");
        return;
    }
    // Add basic phone number validation if desired
    
    try {
      await onSelectZone({
        zoneId: selectedZoneId,
        streetAddress: streetAddress.trim(),
        phoneNumber: phoneNumber.trim(),
      }); 
      // Optionally clear fields on success before parent closes modal
      // setSelectedZoneId(null);
      // setStreetAddress("");
      // setPhoneNumber("");
    } catch (error) {
      console.error("Error selecting zone:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Delivery Details</DialogTitle>
          <DialogDescription>
            Choose the delivery zone and provide address details.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
           {/* Zone Selection */}
           <div>
             <Label className="text-sm font-medium">Delivery Zone</Label>
             {!activeZones ? (
               <p className="text-sm text-muted-foreground">Loading zones...</p>
             ) : activeZones.length === 0 ? (
               <p className="text-sm text-muted-foreground">No delivery zones available.</p>
             ) : (
               <RadioGroup
                 value={selectedZoneId ?? undefined}
                 onValueChange={(value) => setSelectedZoneId(value as Id<"deliveryZones">)}
                 className="mt-2"
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

           {/* Address Input */}
           <div>
             <Label htmlFor="streetAddress" className="text-sm font-medium">Street Address</Label>
             <Input 
                id="streetAddress"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Enter your street address"
                className="mt-1"
                disabled={isLoading}
             />
           </div>

           {/* Phone Input */}
           <div>
             <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
             <Input 
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                type="tel" // Use tel type for better mobile UX
                className="mt-1"
                disabled={isLoading}
             />
           </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSelect} 
            disabled={!selectedZoneId || !streetAddress.trim() || !phoneNumber.trim() || isLoading || !activeZones || activeZones.length === 0}
          >
            {isLoading ? "Saving..." : "Confirm Delivery Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 