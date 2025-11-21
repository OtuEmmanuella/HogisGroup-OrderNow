'use client';

import React, { useEffect } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useUIContext } from '@/context/UIContext';
import { useUser } from '@clerk/nextjs';
import { SignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MinusCircle, PlusCircle, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Id } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
  const { isSignedIn, isLoaded } = useUser();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    console.log("[CartDrawer] Received isCartDrawerOpen:", isCartDrawerOpen);
  }, [isCartDrawerOpen]);

  // FIXED: Proper currency formatting that divides by 100 for kobo to Naira conversion
  const formatPrice = (amountKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountKobo / 100); // CRITICAL FIX: Divide by 100 to convert kobo to Naira
  };

  const handleCheckoutClick = () => {
    if (!isSignedIn && isLoaded) {
      setShowAuthModal(true);
      return;
    }
    closeCartDrawer();
  };

  // FIXED: Proper increment handler - adds one more of the same item
  const handleIncrement = (item: any) => {
    addToCart({ _id: item._id, name: item.name, price: item.price });
  };

  // FIXED: Proper decrement handler with type casting
  const handleDecrement = (itemId: string) => {
    decrementItem(itemId as Id<"menuItems">);
  };

  // FIXED: Proper delete handler with type casting
  const handleDelete = (itemId: string) => {
    removeFromCart(itemId as Id<"menuItems">);
  };

  return (
    <>
      <Drawer open={isCartDrawerOpen} onOpenChange={(open) => {
        if (!open) closeCartDrawer();
      }}>
        <DrawerContent className={cn(
          "flex flex-col",
          isDesktop ? "max-h-screen h-screen w-[400px]" : "max-h-[85vh]"
        )}>
          <DrawerHeader className="text-left relative pt-4 px-4 pb-2 border-b">
            <DrawerTitle className="text-lg font-semibold">Your Cart ({totalItems})</DrawerTitle>
            <DrawerDescription>Review items before checkout</DrawerDescription>
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
                    <div className="w-14 h-14 bg-secondary rounded-md flex-shrink-0 relative overflow-hidden">
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">IMG</div>
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium text-sm mb-0.5 line-clamp-1">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {/* FIXED: Decrement button - shows trash icon when quantity is 1 */}
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-6 w-6 rounded-full"
                          onClick={() => handleDecrement(item._id)}
                          title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <MinusCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <span className="text-sm font-medium w-6 text-center tabular-nums">{item.quantity}</span>
                        {/* FIXED: Increment button - properly increases quantity */}
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-6 w-6 rounded-full"
                          onClick={() => handleIncrement(item)}
                          title="Increase quantity"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* FIXED: Delete button - completely removes the item */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive ml-1"
                        onClick={() => handleDelete(item._id)}
                        title="Remove item completely"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {cartItems.length > 0 && (
            <DrawerFooter className="border-t bg-background mt-auto px-4 py-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-muted-foreground text-sm">Subtotal</span>
                <span className="font-semibold text-lg">{formatPrice(cartTotal)}</span>
              </div>
              {isSignedIn ? (
                <Button 
                  asChild 
                  className="w-full bg-[#bd3838] hover:bg-[#e05a19]"
                  onClick={handleCheckoutClick}
                >
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              ) : (
                <Button 
                  className="w-full bg-[#bd3838] hover:bg-[#e05a19]"
                  onClick={handleCheckoutClick}
                >
                  Sign in to Checkout
                </Button>
              )}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to continue checkout</DialogTitle>
            <DialogDescription>
              Please sign in or create an account to complete your order.
            </DialogDescription>
          </DialogHeader>
          <div className="mx-auto w-full max-w-sm">
            <SignIn afterSignInUrl="/checkout" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}