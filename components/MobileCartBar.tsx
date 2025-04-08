'use client';

import React, { useId } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileCartBar() {
  const { totalItems, cartTotal } = useOrderContext();
  const { openCartDrawer } = useUIContext();
  const uniqueId = useId();

  const displayTotal = (cartTotal / 100).toFixed(2);

  // Function to handle click
  const handleOpenDrawer = () => {
    console.log("[MobileCartBar] Clicked to open drawer");
    openCartDrawer();
  };

  // Only render if there are items in the cart
  if (totalItems === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40", 
        "bg-gradient-to-t from-black/80 via-black/70 to-black/60 backdrop-blur-sm",
        "text-white shadow-lg border-t border-gray-700/50", 
        "transition-transform duration-300 ease-in-out",
      )}
      suppressHydrationWarning={true}
      id={`mobile-cart-${uniqueId}`}
    >
      <Button 
        variant="ghost" 
        className="w-full h-16 flex justify-between items-center px-4 py-2 text-left text-white hover:bg-white/10"
        onClick={handleOpenDrawer}
      >
        <div className="flex items-center gap-3">
          <div className='relative'>
            <ShoppingBag size={24} />
            <span className="absolute -top-1 -right-1.5 bg-[#F96521] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {totalItems}
            </span>
          </div>
          <span className="text-sm font-medium">View Your Cart</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">₦{displayTotal}</span>
          <ChevronUp size={18} />
        </div>
      </Button>
    </div>
  );
} 