'use client';

import React, { useEffect } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useUIContext } from '@/context/UIContext';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MinusCircle, PlusCircle, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function CartDrawer() {
  const { 
    cartItems,
    cartTotal,
    totalItems,
    addToCart,
    decrementItem,
    removeFromCart 
  } = useOrderContext();
  
  const { isCartDrawerOpen, closeCartDrawer } = useUIContext();
  
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
      console.log("[CartDrawer] Received isCartDrawerOpen:", isCartDrawerOpen);
  }, [isCartDrawerOpen]);

  const displayTotal = (cartTotal / 100).toFixed(2);

  return (
    <Drawer 
      open={isCartDrawerOpen} 
      direction={isDesktop ? 'left' : 'bottom'}
      onOpenChange={(open) => {
        console.log("[CartDrawer] Drawer onOpenChange called with:", open);
        if (!open) closeCartDrawer();
      }}
    >
      <DrawerContent className={
        cn(
          "flex flex-col", 
          isDesktop ? "max-h-screen h-screen w-[400px]" : "max-h-[85vh]"
        )
      }>
        <DrawerHeader className="text-left relative pt-4 px-4 pb-2 border-b">
          <DrawerTitle className="text-lg font-semibold">Your Cart ({totalItems})</DrawerTitle>
          <DrawerDescription>Review items before checkout.</DrawerDescription>
           <DrawerClose asChild className="absolute top-3 right-3">
             <Button variant="ghost" size="icon" onClick={closeCartDrawer}>
               <X className="h-4 w-4" />
               <span className="sr-only">Close</span>
             </Button>
           </DrawerClose>
        </DrawerHeader>

        <ScrollArea className="flex-grow overflow-y-auto px-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center py-4 gap-3">
                  {/* Basic image placeholder - TODO: Enhance with actual image if available */}
                  <div className="w-14 h-14 bg-secondary rounded-md flex-shrink-0 relative overflow-hidden">
                     {/* <Image src={item.imageUrl || '/images/placeholder-image.svg'} alt={item.name} fill className="object-cover" /> */}
                     <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">IMG</div>
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm mb-0.5 line-clamp-1">{item.name}</p>
                    <p className="text-muted-foreground text-xs">₦{(item.price / 100).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => decrementItem(item._id)}
                    >
                       <MinusCircle className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => addToCart({ _id: item._id, name: item.name, price: item.price })}
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive ml-1"
                      onClick={() => removeFromCart(item._id)}
                    >
                       <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {cartItems.length > 0 && (
          <DrawerFooter className="border-t bg-background mt-auto px-4 py-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-muted-foreground text-sm">Subtotal</span>
              <span className="font-semibold text-lg">₦{displayTotal}</span>
            </div>
            <Button 
              asChild 
              className="w-full bg-[#F96521] hover:bg-[#e05a19]"
              onClick={closeCartDrawer}
            >
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
} 