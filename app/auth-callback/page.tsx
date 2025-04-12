'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const joinSharedCart = useMutation(api.sharedCarts.joinSharedCart);

  useEffect(() => {
    if (!isLoaded) return;

    const inviteCode = localStorage.getItem('inviteCode');
    localStorage.removeItem('inviteCode');

    if (isSignedIn && inviteCode) {
      joinCart(inviteCode);
    } else if (isSignedIn) {
      router.push('/home'); // Redirect to home if no invite code
    } else if (!isSignedIn) {
      // Redirect to sign-in if not signed in
      router.push('/sign-in');
    }
  }, [isSignedIn, isLoaded, router, joinSharedCart]);

  const joinCart = async (inviteCode: string) => {
    try {
      const result = await joinSharedCart({ inviteCode });
      toast.success(result.alreadyMember ? "You are already in this cart." : "Successfully joined the cart!");
      router.push(`/shared-cart/${result.cartId}`);
    } catch (error) {
      console.error("Failed to join shared cart:", error);
      toast.error(`Failed to join cart: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Redirecting...</p>
    </div>
  );
}