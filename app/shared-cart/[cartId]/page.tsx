'use client';

import React, { useState, useEffect } from 'react'; // Import useEffect
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import { Trash2, PlusCircle, Users, ShoppingBag, CreditCard, Copy, UserCircle, Loader2, RotateCcw } from 'lucide-react'; // Icons + Loader
import { useOrderContext } from '@/context/OrderContext'; // Import context hook

// Helper function to format currency (adjust as needed)
const formatCurrency = (amountKobo: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amountKobo / 100);
};

// Define the expected structure of enriched data from the query
type EnrichedSharedCartMember = Doc<'sharedCartMembers'> & {
    name: string;
    imageUrl?: string | null; // Add optional imageUrl
};
type EnrichedSharedCartItem = Doc<'sharedCartItems'> & { name: string; imageUrl?: string | null };
type EnrichedSharedCartData = Doc<'sharedCarts'> & {
    members: EnrichedSharedCartMember[];
    items: EnrichedSharedCartItem[];
};


export default function SharedCartPage() {
  const params = useParams();
  const router = useRouter();
  const { userId, isSignedIn, isLoaded } = useAuth();
  const { setActiveSharedCartId } = useOrderContext(); // Get setter from context
  const cartId = params.cartId as Id<'sharedCarts'>;

  const [isRemovingItem, setIsRemovingItem] = useState<Id<'sharedCartItems'> | null>(null);
  const [isPayingMyShare, setIsPayingMyShare] = useState(false);
  const [isPayingForAll, setIsPayingForAll] = useState(false);
  const [isCancellingCart, setIsCancellingCart] = useState(false); // Loading state for cancel

  // Set active shared cart ID in context whenever cartId is available
  useEffect(() => {
    // Only set if cartId is valid, otherwise it might clear unnecessarily
    if (cartId) {
      setActiveSharedCartId(cartId);
    }
    // We rely on navigating away or changing branch to clear the activeSharedCartId via the context setters
  }, [cartId, setActiveSharedCartId]);

  // Fetch shared cart data only if Clerk is loaded, user is signed in, userId is available, and cartId exists
  const shouldSkipQuery = !isLoaded || !isSignedIn || !userId || !cartId; // Added !userId check
  const sharedCartData = useQuery(
    api.sharedCarts.getSharedCart,
    shouldSkipQuery ? 'skip' : { cartId }
  );

  // Define mutations/actions needed
  const removeItemMutation = useMutation(api.sharedCarts.removeSharedCartItem);
  const startSplitPaymentMutation = useMutation(api.sharedCarts.startSplitPayment);
  const startPayAllMutation = useMutation(api.sharedCarts.startPayAll);
  const initializePaymentAction = useAction(api.paystack.initializeSharedCartTransaction);
  const cancelCartMutation = useMutation(api.sharedCarts.cancelSharedCart); // Add cancel mutation

  // Loading and error states
  if (!isLoaded || sharedCartData === undefined) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (sharedCartData === null) {
    // Clear context if cart is not found or access denied
    setActiveSharedCartId(null);
    return <div className="flex justify-center items-center min-h-screen">Cart not found or access denied.</div>;
  }

  // Cast the data to the enriched type
  const cart = sharedCartData as EnrichedSharedCartData;

  // Destructure data for easier access
  const {
    status,
    paymentMode,
    inviteCode,
    totalAmount,
    initiatorId,
    members,
    items,
  } = cart;

  const isInitiator = userId === initiatorId;
  const canModifyCart = status === 'open'; // Can only modify if cart is open
  const currentUserMemberInfo = members.find((m: EnrichedSharedCartMember) => m.userId === userId);

  // --- Helper Functions ---

  const handleRemoveItem = async (itemId: Id<'sharedCartItems'>) => {
    if (!canModifyCart) {
        toast.warning("Cannot remove items once payment has started.");
        return;
    }
    setIsRemovingItem(itemId);
    try {
      await removeItemMutation({ cartItemId: itemId });
      toast.info("Item removed from group order.");
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error(`Failed to remove item: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRemovingItem(null);
    }
  };

  const copyInviteCode = () => {
      if (inviteCode) {
          navigator.clipboard.writeText(inviteCode);
          toast.success("Invite code copied!");
      }
  }

  const handlePayMyShare = async () => {
      if (!currentUserMemberInfo || currentUserMemberInfo.paymentStatus === 'paid') {
          toast.info("You have already paid your share.");
          return;
      }
      setIsPayingMyShare(true);
      try {
          const result = await startSplitPaymentMutation({ cartId });

          if (result.success && result.paymentData) {
              const authorization_url = await initializePaymentAction(result.paymentData);
              window.location.href = authorization_url;
          } else {
              throw new Error("Failed to prepare payment.");
          }
      } catch (error) {
          console.error("Failed to initiate split payment:", error);
          toast.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          setIsPayingMyShare(false);
      }
  };

  const handlePayForAll = async () => {
      if (!isInitiator) {
          toast.error("Only the initiator can pay for all.");
          return;
      }
      setIsPayingForAll(true);
      try {
          const result = await startPayAllMutation({ cartId });

          if (result.success && result.paymentData) {
              const authorization_url = await initializePaymentAction(result.paymentData);
              window.location.href = authorization_url;
           } else {
               throw new Error("Failed to prepare payment.");
          }
      } catch (error) {
          console.error("Failed to initiate pay-all:", error);
          toast.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          setIsPayingForAll(false);
      }
  };

  const handleCancelCart = async () => {
      setIsCancellingCart(true);
      try {
          await cancelCartMutation({ cartId });
          toast.success("Group order cancelled.");
          router.push('/home'); // Go back to the menu
      } catch (error) {
          console.error("Failed to cancel cart:", error);
          toast.error(`Failed to cancel group order: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
          setIsCancellingCart(false);
      }
  };

  // --- Render Logic ---
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Group Order</h1>
        {/* Button to go back to menu */}
        <Button variant="outline" onClick={() => router.push('/home')} disabled={!canModifyCart}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add More Items
        </Button>
      </div>

      {/* Cart Status and Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>Status: <Badge variant={status === 'completed' ? 'default' : 'secondary'}>{status}</Badge></p>
          <p>Payment Mode: <span className="font-semibold">{paymentMode}</span></p>
          {status === 'open' && inviteCode && (
            <div className="flex items-center gap-2">
                <span>Invite Code:</span>
                <span className="font-mono bg-muted px-2 py-1 rounded">{inviteCode}</span>
                <Button variant="ghost" size="sm" onClick={copyInviteCode} title="Copy invite code">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Member List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Members ({members?.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {members?.map((member: EnrichedSharedCartMember) => (
                <li key={member._id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {/* Avatar Display */}
                    {member.imageUrl ? (
                        <Image
                            src={member.imageUrl}
                            alt={member.name ?? 'User Avatar'}
                            width={24} // Adjust size as needed
                            height={24}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <UserCircle className="h-6 w-6 text-muted-foreground" /> // Fallback icon
                    )}
                    {member.name} {member.userId === initiatorId ? '(Initiator)' : ''} {member.userId === userId ? '(You)' : ''}
                  </span>
                  <Badge variant={member.paymentStatus === 'paid' ? 'default' : 'outline'}>{member.paymentStatus}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Item List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Items ({items?.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items && items.length > 0 ? (
              <ul className="space-y-4">
                {items.map((item: EnrichedSharedCartItem) => (
                  <li key={item._id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-muted-foreground">?</div>
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                        {/* Show who added it */}
                        <p className="text-xs text-muted-foreground italic">
                          Added by: {members.find((m: EnrichedSharedCartMember) => m.userId === item.userId)?.name ?? 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="font-medium text-sm">{formatCurrency(item.unitPrice * item.quantity)}</span>
                       {canModifyCart && (userId === item.userId || isInitiator) && (
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleRemoveItem(item._id)}
                           disabled={isRemovingItem === item._id}
                           title="Remove item"
                           className="h-8 w-8"
                         >
                           {isRemovingItem === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                         </Button>
                       )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No items added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Section */}
      <Card className="mt-6">
         <CardHeader>
             <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment</CardTitle>
         </CardHeader>
         <CardContent>
             <div className="flex justify-between items-center mb-4">
                 <span className="text-lg font-semibold">Total:</span>
                 <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
             </div>
             <Separator className="mb-4" />

             {/* Payment Buttons Logic */}
             <div className="flex flex-col items-center gap-3">
                 {status === 'completed' && <p className="text-center text-green-600 font-medium">This order is complete!</p>}
                 {status === 'expired' && isInitiator && (
                    <>
                        <p className="text-center text-red-600 font-medium">This group order has expired.</p>
                        <Button variant="destructive" onClick={handleCancelCart} disabled={isCancellingCart} className="w-full sm:w-auto">
                            {isCancellingCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                            Clear Group Order
                        </Button>
                        <Button variant="secondary" onClick={() => router.push('/home')} className="w-full sm:w-auto">
                            Back to Menu
                        </Button>
                    </>
                 )}
                 {status === 'expired' && !isInitiator && (
                    <p className="text-center text-red-600 font-medium">This group order has expired.</p>
                 )}

                 {/* Split Payment Button */}
                 {status === 'paying' && paymentMode === 'split' && currentUserMemberInfo?.paymentStatus === 'pending' && (
                     <Button onClick={handlePayMyShare} disabled={isPayingMyShare} className="w-full sm:w-auto">
                         {isPayingMyShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Pay My Share ({formatCurrency(currentUserMemberInfo.amountDue)})
                     </Button>
                 )}
                 {status === 'paying' && paymentMode === 'split' && currentUserMemberInfo?.paymentStatus === 'paid' && (
                     <p className="text-center text-green-600 text-sm">You have paid your share.</p>
                 )}

                 {/* Pay All Button (Initiator only) */}
                 {status === 'locked' && paymentMode === 'payAll' && isInitiator && (
                     <Button onClick={handlePayForAll} disabled={isPayingForAll} className="w-full sm:w-auto">
                         {isPayingForAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Pay for All ({formatCurrency(totalAmount)})
                     </Button>
                 )}
                 {status === 'locked' && paymentMode === 'payAll' && !isInitiator && (
                     <p className="text-center text-muted-foreground text-sm">The initiator is paying for this order.</p>
                 )}

                 {/* Buttons to START payment (only show if cart is 'open') */}
                 {status === 'open' && paymentMode === 'split' && (
                     <Button onClick={handlePayMyShare} disabled={isPayingMyShare} className="w-full sm:w-auto">
                         {isPayingMyShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Proceed to Pay My Share
                     </Button>
                 )}
                 {status === 'open' && paymentMode === 'payAll' && isInitiator && (
                     <Button onClick={handlePayForAll} disabled={isPayingForAll} className="w-full sm:w-auto">
                         {isPayingForAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Proceed to Pay for All
                     </Button>
                 )}
                  {status === 'open' && paymentMode === 'payAll' && !isInitiator && (
                     <p className="text-center text-muted-foreground text-sm">Waiting for initiator to start payment.</p>
                 )}
             </div>
         </CardContent>
      </Card>

    </div>
  );
}
