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
}

const orderTypes: { type: OrderType; label: string; description: string }[] = [
  {
    type: 'Delivery',
    label: 'Delivery',
    description: 'Get your order delivered to your doorstep.',
  },
  {
    type: 'Take-out',
    label: 'Take-out / Pickup',
    description: 'Collect your order from the branch.',
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
}: OrderTypeSelectorProps) {
  // TODO: Filter orderTypes based on supportedTypes from the selected branch

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>How would you like to get your order?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {orderTypes.map(({ type, label, description }) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              className="h-auto py-4 flex flex-col items-start text-left" // Changed alignment
              onClick={() => onSelectType(type)}
              // TODO: Add disabled state based on supportedTypes
            >
              <span className="font-semibold mb-1">{label}</span>
              <span className="text-sm text-muted-foreground font-normal">
                {description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 