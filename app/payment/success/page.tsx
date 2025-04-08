'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4">Payment Successful!</CardTitle>
          <CardDescription>
            Your order has been received and is being processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderId ? (
            <p className="text-sm text-muted-foreground">
              Your Order ID is: {orderId}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
                Your order is confirmed.
        </p>
      )}
          
          {orderId && (
            <Button asChild className="w-full">
              <Link href={`/orders/${orderId}`}>
                Track Your Order
      </Link>
            </Button>
          )}
          <Button variant="outline" asChild className="w-full">
      <Link href="/">
              Place Another Order
      </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 