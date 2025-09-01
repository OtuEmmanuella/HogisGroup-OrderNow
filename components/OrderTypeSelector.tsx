'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define the possible order types based on schema
export type OrderType = "Delivery" | "Dine-In" | "Take-out";

interface OrderTypeSelectorProps {
  // TODO: Add supportedTypes: OrderType[] based on selected branch later
  selectedType: OrderType | null;
  onSelectType: (type: OrderType) => void;
  isCreatingCart?: boolean;
  className?: string;
}

const orderTypes: { type: OrderType; label: string; description: string }[] = [
  {
    type: 'Delivery',
    label: 'Delivery',
    description: 'Freshly delivered to your doorstep',
  },
  {
    type: 'Take-out',
    label: 'Take-out / Pickup',
    description: 'Quick and easy branch pickup.',
  },
  {
    type: 'Dine-In',
    label: 'Dine-In',
    description: 'Enjoy your meal at the branch.',
  },
];

export default function OrderTypeSelector({
  selectedType,
  onSelectType,
  isCreatingCart,
  className = '',
}: OrderTypeSelectorProps) {
  // TODO: Filter orderTypes based on supportedTypes from the selected branch

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {orderTypes.map(({ type, label, description }) => (
          <div key={type} className="relative">
            {/* Gradient border container */}
            <div 
              className={`absolute inset-0 rounded-md transition-opacity duration-200 ${
                selectedType === type 
                  ? 'bg-gradient-to-r from-[#F9A825] to-[#F9A835] opacity-100' 
                  : 'opacity-0'
              }`}
            />
            
            {/* Inner content with padding to show border */}
            <div className={`relative ${selectedType === type ? 'p-0.5' : ''}`}>
              <Button
                variant="outline"
                className={`w-full h-auto py-6 px-4 flex flex-col items-start text-left relative overflow-hidden group transition-all duration-200 ${
                  selectedType === type 
                    ? 'bg-white border-transparent shadow-md' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}
                onClick={() => onSelectType(type)}
                disabled={isCreatingCart}
              >
                <div className="w-full">
                  <span className="font-semibold text-base mb-2 block">{label}</span>
                  <span className="text-sm font-normal text-muted-foreground block leading-relaxed">
                    {description}
                  </span>
                </div>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}