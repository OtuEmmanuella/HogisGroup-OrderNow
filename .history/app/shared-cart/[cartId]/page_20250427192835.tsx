'use client';

import React, { useState, useEffect } from 'react'; // Import useEffect
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react'; // Remove useAction
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import { Trash2, PlusCircle, Users, ShoppingBag, CreditCard, Copy, UserCircle, Loader2, RotateCcw, Truck, MapPin } from 'lucide-react'; // Icons + Loader
import { useOrderContext } from '@/context/OrderContext'; // Import context hook
// Import the server action directly
import { initializeSharedCartTransaction } from '@/app/actions/initializeSharedCartTransaction';
import DeliveryZoneSelectorModal, { DeliverySelectionData } from '@/components/DeliveryZoneSelectorModal'; // Import type
import { formatCurrency } from "@/lib/utils"; // Assuming you have this

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
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false); // State for modal
  const [isSettingZone, setIsSettingZone] = useState(false); // Loading state for setting zone

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

  // Fetch selected delivery zone name if applicable
  const selectedZoneId = sharedCartData?.deliveryZoneId;
  const selectedZone = useQuery(
      api.deliveryZones.getDeliveryZoneById,
      selectedZoneId ? { zoneId: selectedZoneId } : 'skip'
  );

  // Define mutations/actions needed
  const removeItemMutation = useMutation(api.sharedCarts.removeSharedCartItem);
  const startSplitPaymentMutation = useMutation(api.sharedCarts.startSplitPayment);
  const startPayAllMutation = useMutation(api.sharedCarts.startPayAll);
  const cancelCartMutation = useMutation(api.sharedCarts.cancelSharedCart); // Add cancel mutation
  const setDeliveryZoneMutation = useMutation(api.sharedCarts.setCartDeliveryZone); // Add mutation

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
    orderType,
    deliveryFee,
    deliveryZoneId,
  } = cart;

  const isInitiator = userId === initiatorId;
  const canModifyCart = status === 'open'; // Can only modify if cart is open
  const currentUserMemberInfo = members.find((m: EnrichedSharedCartMember) => m.userId === userId);
  const isDelivery = orderType === 'Delivery';
  const needsDeliveryZone = isDelivery && !deliveryZoneId;
  const canPay = isDelivery ? !!deliveryZoneId : true; // Can only pay delivery if zone is set

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

  const handleSelectZone = async (data: DeliverySelectionData) => {
    setIsSettingZone(true);
    try {
      const result = await setDeliveryZoneMutation({ 
        cartId, 
        deliveryZoneId: data.zoneId, 
        streetAddress: data.streetAddress,
        phoneNumber: data.phoneNumber,
      });
      toast.success(`Delivery details set. Fee: ${formatCurrency(result.deliveryFee)}`);
      setIsZoneModalOpen(false);
    } catch (error) {
      console.error("Failed to set delivery zone:", error);
      toast.error(`Failed to set delivery details: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSettingZone(false);
    }
  };

  const handlePayMyShare = async () => {
      if (!canPay) {
          toast.error("Please wait for the initiator to select a delivery zone.");
          return;
      }
      if (!currentUserMemberInfo || currentUserMemberInfo.paymentStatus === 'paid') {
          toast.info("You have already paid your share or are not part of this cart.");
          return;
      }
      if (status !== 'open' && status !== 'paying') {
          toast.warning(`Cannot initiate payment. Cart status is: ${status}`);
          return;
      }

      setIsPayingMyShare(true);
      try {
          // 1. Start the split payment process (calculates amount due)
          const splitResult = await startSplitPaymentMutation({ cartId });

          // Check if the mutation itself was successful and returned payment data
          if (splitResult && splitResult.success && splitResult.paymentData) {
              // 2. Initialize Paystack transaction with the calculated amount
              const paymentUrl = await initializeSharedCartTransaction({
                  cartId: cartId, // Pass cartId from component scope
                  userId: splitResult.paymentData.metadata.userId, // Get userId from metadata
                  email: splitResult.paymentData.email, // Get email from paymentData
                  amountKobo: splitResult.paymentData.amount + (deliveryFee && paymentMode === 'split' ? Math.ceil(deliveryFee / members.length) : 0),
              });

              // Check if a valid URL was returned
              if (paymentUrl && typeof paymentUrl === 'string') {
                  console.log("Redirecting to Paystack for split payment:", paymentUrl);
                  window.location.href = paymentUrl; // Redirect to Paystack
              } else {
                  throw new Error("Failed to get payment URL from initialization.");
              }
          } else {
              // Handle cases where startSplitPaymentMutation didn't return expected data
              const errorMessage = (splitResult && typeof splitResult === 'object' && 'message' in splitResult && typeof splitResult.message === 'string')
                                   ? splitResult.message
                                   : "Failed to prepare split payment.";
              throw new Error(errorMessage);
          }

      } catch (error) {
          console.error("Failed to pay my share:", error);
          toast.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
          setIsPayingMyShare(false);
      }
  };

  const handlePayForAll = async () => {
      if (!canPay) {
          toast.error("Please select a delivery zone before paying.");
          return;
      }
      if (!isInitiator) {
          toast.error("Only the cart initiator can pay for everyone.");
          return;
      }
      if (status !== 'open') {
          toast.warning(`Cannot initiate payment. Cart status is: ${status}`);
          return;
      }

      setIsPayingForAll(true);
      try {
          // 1. Start the pay-all process (locks cart, gets total amount)
          const payAllResult = await startPayAllMutation({ cartId });

          // Check if the mutation was successful and returned payment data
          if (payAllResult && payAllResult.success && payAllResult.paymentData) {
              // 2. Initialize Paystack transaction with the full amount
              const paymentUrl = await initializeSharedCartTransaction({
                  cartId: cartId, // Pass cartId from component scope
                  userId: payAllResult.paymentData.metadata.userId, // Get userId from metadata
                  email: payAllResult.paymentData.email, // Get email from paymentData
                  amountKobo: payAllResult.paymentData.amount + (deliveryFee || 0),
              });

              // Check if a valid URL was returned
              if (paymentUrl && typeof paymentUrl === 'string') {
                  console.log("Redirecting to Paystack for pay-all:", paymentUrl);
                  window.location.href = paymentUrl; // Redirect to Paystack
              } else {
                  throw new Error("Failed to get payment URL from initialization.");
              }
          } else {
              // Handle cases where startPayAllMutation didn't return expected data
              const errorMessage = (payAllResult && typeof payAllResult === 'object' && 'message' in payAllResult && typeof payAllResult.message === 'string')
                                   ? payAllResult.message
                                   : "Failed to prepare pay-all payment.";
              throw new Error(errorMessage);
          }

      } catch (error) {
          console.error("Failed to pay for all:", error);
          toast.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
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

  // Calculate amounts for display
  const subtotal = totalAmount;
  const finalTotal = subtotal + (deliveryFee || 0);
  const amountDuePerMemberSplit = members.length > 0 ? Math.ceil(finalTotal / members.length) : 0;

  // --- Render Logic ---
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Modal Component */} 
      <DeliveryZoneSelectorModal 
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        onSelectZone={handleSelectZone}
        isLoading={isSettingZone}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Group Order</h1>
        <Button variant="outline" onClick={() => router.push('/home')} disabled={!canModifyCart}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add More Items
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6"> 
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

      {/* Order Summary Card - NOW AFTER Members/Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Status:</span> 
            <Badge variant={status === 'completed' ? 'success' : status === 'open' ? 'secondary' : status === 'cancelled' ? 'destructive' : 'default'}>
              {status}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Payment Mode:</span> 
            <span className="font-semibold">{paymentMode === 'split' ? 'Split Between Members' : 'Initiator Pays All'}</span>
          </div>
          {status === 'open' && inviteCode && (
            <div className="flex items-center gap-2">
                <span>Invite Code:</span>
                <span className="font-mono bg-muted px-2 py-1 rounded">{inviteCode}</span>
                <Button variant="ghost" size="sm" onClick={copyInviteCode} title="Copy invite code">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>Items Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          
          {/* Display Delivery Info IF order type is Delivery */}
          {isDelivery && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span>Delivery Zone:</span>
                  {deliveryZoneId && selectedZone ? (
                    <span className="font-medium flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground"/>{selectedZone.name}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Not selected</span>
                  )}
                </div>
                <div className="flex justify-between">
                    <span>Delivery Address:</span>
                    {cart.deliveryStreetAddress ? (
                        <span className="font-medium text-right">{cart.deliveryStreetAddress}</span>
                    ) : (
                        <span className="text-muted-foreground italic">Not set</span>
                    )}
                </div>
                <div className="flex justify-between">
                    <span>Delivery Phone:</span>
                    {cart.deliveryPhoneNumber ? (
                        <span className="font-medium">{cart.deliveryPhoneNumber}</span>
                    ) : (
                        <span className="text-muted-foreground italic">Not set</span>
                    )}
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  {deliveryFee !== undefined && deliveryFee !== null ? (
                    <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                  ) : (
                     <span className="text-muted-foreground italic">N/A</span>
                  )}
                </div>
              </>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Amount:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
          {paymentMode === 'split' && members.length > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Approx. Per Member:</span>
              <span>{formatCurrency(amountDuePerMemberSplit)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card className="mt-6">
         <CardHeader>
             <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
             {/* Delivery Zone & Address Selection Button */} 
             {isInitiator && isDelivery && needsDeliveryZone && status === 'open' && (
               <Button 
                 className="w-full mb-3 bg-blue-600 hover:bg-blue-700" 
                 onClick={() => setIsZoneModalOpen(true)}
               >
                 <Truck className="mr-2 h-4 w-4"/> Select Delivery Details
               </Button>
             )}

             {/* Display selected delivery details if set */}
             {isDelivery && deliveryZoneId && (
                 <div className="text-sm border p-3 rounded-md bg-secondary/50 mb-3 space-y-1">
                     <p className="font-medium flex items-center gap-1">
                         <Truck className="h-4 w-4 text-muted-foreground"/> Delivery To:
                     </p>
                     {selectedZone && <p className="ml-5"><MapPin className="h-4 w-4 inline-block mr-1 text-muted-foreground"/> Zone: {selectedZone.name}</p>}
                     {cart.deliveryStreetAddress && <p className="ml-5">Address: {cart.deliveryStreetAddress}</p>}
                     {cart.deliveryPhoneNumber && <p className="ml-5">Phone: {cart.deliveryPhoneNumber}</p>}
                     {deliveryFee !== undefined && deliveryFee !== null && (
                         <p className="ml-5">Fee: {formatCurrency(deliveryFee)}</p>
                     )}
                     {/* Optional: Add button to CHANGE details */} 
                     {isInitiator && status === 'open' && (
                         <Button 
                           variant="outline"
                           size="sm"
                           className="mt-2 w-full"
                           onClick={() => setIsZoneModalOpen(true)} // Re-opens modal
                           disabled={isSettingZone} // Disable if currently saving
                         >
                           Change Delivery Details
                         </Button>
                     )}
                 </div>
             )}

             {/* Conditional message if zone/address needed */}
             {isDelivery && needsDeliveryZone && (
                 <p className="text-center text-sm text-orange-600 font-medium">
                     Initiator must select delivery details before payment can proceed.
                 </p>
             )}

             {/* Pay Buttons (Disabled logic remains the same using canPay) */} 
             {status === 'open' && paymentMode === 'split' && (
                <Button
                 className="w-full"
                 onClick={handlePayMyShare}
                 disabled={isPayingMyShare || !canPay}
                 size="lg"
                >
                  {isPayingMyShare ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Proceed to Pay My Share'}
                </Button>
             )}
             {status === 'open' && paymentMode === 'payAll' && isInitiator && (
                <Button
                 className="w-full"
                 onClick={handlePayForAll}
                 disabled={isPayingForAll || !canPay}
                 size="lg"
                >
                  {isPayingForAll ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Proceed to Pay for All'}
                </Button>
             )}
             {/* ... Other status buttons (paying, locked, completed, expired) ... */}
             
             {/* Display message if not initiator for payAll */}
             {paymentMode === 'payAll' && !isInitiator && (
                 <p className="text-center text-sm text-muted-foreground">The initiator will pay for this order.</p>
             )}
             
             {/* Cancel Button */}
             {isInitiator && (status === 'open' || status === 'paying' || status === 'locked') && (
                <Button
                   variant="destructive"
                   className="w-full mt-2"
                   onClick={handleCancelCart}
                   disabled={isCancellingCart}
                 >
                   {isCancellingCart ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</> : <> <RotateCcw className="mr-2 h-4 w-4" /> Cancel Group Order</>}
                 </Button>
             )}
         </CardContent>
      </Card>

    </div>
  );
}
