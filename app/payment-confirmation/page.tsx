'use client'

import React from "react";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Confetti from 'react-confetti'
import { Loader2 } from "lucide-react";

export default function PaymentConfirmationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reference = searchParams.get('reference');
    const [showConfetti, setShowConfetti] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        setIsLoading(true);
        router.push('/home');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            {showConfetti && <Confetti />}
            <Card className="w-full max-w-md p-6 space-y-4 text-center">
                <h1 className="text-2xl font-bold mb-4 text-green-600">Payment Successful!</h1>
                <p className="text-gray-600 mb-6">
                    Your payment has been processed successfully. We&apos;ll start preparing your order right away.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                    Reference: {reference}
                </p>
                <Button 
                    className="w-full"
                    onClick={handleClick}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Please wait...
                        </>
                    ) : (
                        'Return to Menu'
                    )}
                </Button>
            </Card>
        </div>
    );
}