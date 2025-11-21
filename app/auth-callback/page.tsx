'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { useOrderContext } from '@/context/OrderContext';
import { Id } from '@/convex/_generated/dataModel';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const joinSharedCart = useMutation(api.sharedCarts.joinSharedCart);
  const createSharedCart = useMutation(api.sharedCarts.createSharedCart);
  const { setActiveSharedCartId } = useOrderContext();

  useEffect(() => {
    if (!isLoaded) return;

    const handleAuthCallback = async () => {
      // Check for invite code (joining existing cart)
      const inviteCode = localStorage.getItem('inviteCode');
      
      // Check for pending group order (creating new cart)
      const pendingGroupOrderStr = localStorage.getItem('pendingGroupOrder');
      
      // Clear localStorage items
      localStorage.removeItem('inviteCode');
      localStorage.removeItem('pendingGroupOrder');

      if (!isSignedIn) {
        router.push('/sign-in');
        return;
      }

      // Handle joining an existing cart
      if (inviteCode) {
        try {
          const result = await joinSharedCart({ inviteCode });
          setActiveSharedCartId(result.cartId);
          toast.success(result.alreadyMember ? "You are already in this cart." : "Successfully joined the cart!");
          router.push(`/shared-cart/${result.cartId}`);
          return;
        } catch (error) {
          console.error("Failed to join shared cart:", error);
          toast.error(`Failed to join cart: ${error instanceof Error ? error.message : "Unknown error"}`);
          router.push('/home');
          return;
        }
      }

      // Handle creating a new group order
      if (pendingGroupOrderStr) {
        try {
          const pendingOrder = JSON.parse(pendingGroupOrderStr);
          
          // Validate the parsed data
          if (!pendingOrder.branchId || !pendingOrder.orderType || !pendingOrder.paymentMode) {
            throw new Error("Invalid pending order data");
          }

          const { cartId, inviteCode } = await createSharedCart({
            branchId: pendingOrder.branchId as Id<'branches'>,
            orderType: pendingOrder.orderType,
            paymentMode: pendingOrder.paymentMode,
          });

          setActiveSharedCartId(cartId);
          toast.success(`Group cart created! Invite code: ${inviteCode}`);
          router.push(`/shared-cart/${cartId}`);
          return;
        } catch (error) {
          console.error("Failed to create shared cart:", error);
          toast.error(`Failed to create group order: ${error instanceof Error ? error.message : "Unknown error"}`);
          router.push('/start-ordering');
          return;
        }
      }

      // Default: no pending actions, go to home
      router.push('/home');
    };

    handleAuthCallback();
  }, [isSignedIn, isLoaded, router, joinSharedCart, createSharedCart, setActiveSharedCartId]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Redirecting...</p>
    </div>
  );
}