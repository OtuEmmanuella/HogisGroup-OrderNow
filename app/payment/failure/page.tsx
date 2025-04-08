'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react'; // Use XCircle for failure

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  // You might get error messages or codes from Paystack in the query params
  const errorMessage = searchParams.get('message') || "Payment failed or was cancelled."; 

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 rounded-full p-3 w-fit">
              <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="mt-4 text-destructive">Payment Failed</CardTitle>
          <CardDescription>
             {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-sm text-muted-foreground">
            Please try again or contact support if the problem persists.
            </p>
          <Button asChild className="w-full">
            <Link href="/checkout"> {/* Link back to checkout */}
              Try Again
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Back to Homepage
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 