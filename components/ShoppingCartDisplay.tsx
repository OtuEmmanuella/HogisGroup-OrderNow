'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from "@/components/ui/separator";
import { MinusCircle, PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrderContext } from '@/context/OrderContext';
import { CartItem } from '@/hooks/useShoppingCart';

export default function ShoppingCartDisplay() {
  const router = useRouter();

  const {
    cartItems,
    cartTotal,
    addToCart,
    decrementItem,
    clearCart,
  } = useOrderContext();

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your Cart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Your cart is empty.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Your Cart</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto pr-3">
        <div className="space-y-4">
          {cartItems.map((item: CartItem) => (
            <div key={item._id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => decrementItem(item._id)}
                >
                  {item.quantity > 1 ? <MinusCircle size={16} /> : <Trash2 size={16} />}
                </Button>
                <span>{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => addToCart(item)}
                >
                  <PlusCircle size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <Separator className="my-4" />
      <CardFooter className="flex flex-col gap-4">
        <div className="flex justify-between w-full font-semibold">
          <span>Total:</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <Button
          className="w-full"
          disabled={cartItems.length === 0}
          onClick={handleCheckout}
        >
          Proceed to Checkout
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={clearCart}
          disabled={cartItems.length === 0}
        >
          Clear Cart
        </Button>
      </CardFooter>
    </Card>
  );
} 