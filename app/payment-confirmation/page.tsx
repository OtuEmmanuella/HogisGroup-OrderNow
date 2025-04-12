'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PaymentConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [orderType, setOrderType] = useState<'regular' | 'shared' | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');

    if (!reference) {
      toast.error("Payment reference not found");
      setVerificationStatus('failed');
      setIsVerifying(false);
      return;
    }

    // Verify payment via the API endpoint
    const verifyPayment = async () => {
      try {
        setIsVerifying(true);
        const response = await fetch(`/api/verify-payment?reference=${reference}`, {
          method: 'GET',
        });

        const data = await response.json();

        if (data.status === 'success') {
          // Payment is verified, check payment type (regular order or shared cart)
          const trxref = searchParams.get('trxref');
          
          // Wait a short time for the webhook to process before redirecting
          toast.success("Payment successful! Finalizing your order...");
          setTimeout(() => {
            setVerificationStatus('success');
            setIsVerifying(false);
          }, 2000);
        } else {
          toast.error(data.message || "Payment verification failed");
          setVerificationStatus('failed');
          setIsVerifying(false);
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        toast.error("Failed to verify payment");
        setVerificationStatus('failed');
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isVerifying ? (
            <div className="mx-auto">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <CardTitle className="mt-4">Verifying Payment</CardTitle>
              <CardDescription>
                Please wait while we confirm your payment...
              </CardDescription>
            </div>
          ) : verificationStatus === 'success' ? (
            <div className="mx-auto">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <CardTitle className="mt-4 text-green-600">Payment Successful!</CardTitle>
              <CardDescription>
                Your payment has been confirmed and your order is being processed.
              </CardDescription>
            </div>
          ) : (
            <div className="mx-auto">
              <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
              <CardTitle className="mt-4 text-amber-600">Payment Issue</CardTitle>
              <CardDescription>
                We couldn't confirm your payment. Please check your payment details.
              </CardDescription>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!isVerifying && (
            <p className="text-center text-sm text-muted-foreground">
              {verificationStatus === 'success' 
                ? "You will receive a confirmation email shortly." 
                : "If you believe this is an error, please contact our support team."}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          {!isVerifying && (
            <>
              {verificationStatus === 'success' ? (
                <Button asChild>
                  <Link href="/orders">View Your Orders</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <Link href="/home">Back to Menu</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/checkout">Try Again</Link>
                  </Button>
                </>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}