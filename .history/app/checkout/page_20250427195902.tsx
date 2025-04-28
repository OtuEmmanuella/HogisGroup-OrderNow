'use client';

import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useQuery, useMutation } from 'convex/react';
// Remove useAction import if no longer needed, or keep if used elsewhere
// import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { Loader2, Tag, X, Slash } from 'lucide-react';
import AddressForm, { type AddressFormData } from '@/components/AddressForm';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/datepicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { type Id, type Doc } from '@/convex/_generated/dataModel';
// Import the server action directly
import { initializePaystackTransaction } from '@/app/actions/initializePaystackTransaction';
import DeliveryZoneSelector from '@/components/DeliveryZoneSelector';
// Removed problematic DeliveryZoneType import
import { ValidatedPromo } from '@/convex/promotions';

// Define proper interfaces to avoid using 'any'
interface DeliveryAddress {
  street: string;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
  // zoneName and deliveryFee removed as they are handled via deliveryZoneId
}

interface CartItem {
  _id: Id<"menuItems">;
  cartItemId?: string;
  name: string;
  price: number;
  quantity: number;
  // Add other fields as needed
}

interface OrderItemForPayload {
  menuItemId: Id<'menuItems'>;
  quantity: number;
  // Add other fields like price or options if needed by backend
}

// Interface for the data passed to createOrder mutation
interface CreateOrderPayload {
  branchId: Id<'branches'>;
  userId: Id<'users'>; // Assuming Clerk user ID is used directly or mapped
  customerName: string;
  items: OrderItemForPayload[];
  orderType: "Delivery" | "Dine-In" | "Take-out";
  appliedPromoId?: Id<'promotions'>;
  deliveryAddress?: DeliveryAddress; // Only for Delivery
  deliveryZoneId?: Id<'deliveryZones'>; // Only for Delivery
  pickupTime?: number; // Timestamp, Only for Take-out
  dineInDateTime?: number; // Timestamp, Only for Dine-In
  dineInGuests?: number; // Only for Dine-In
  dineInReservationType?: string; // Only for Dine-In
}

// Type for Paystack Action Result (adjust based on actual return type)
// Assuming it might return error OR data based on linter feedback
type PaystackResult = 
  | { error: string; data?: never; authorizationUrl?: never }
  | { error?: never; data?: { authorization_url: string; [key: string]: any }; authorizationUrl?: string; [key: string]: any };

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded: isUserLoaded } = useUser();
  const {
    selectedBranchId,
    selectedOrderType,
    cartItems,
    cartTotal,
    // resetOrderFlow, // Removed as unused - keep if needed elsewhere
    // activeSharedCartId // Removed as unused - keep if needed elsewhere
    clearCart, // Assuming clearCart exists in context
    // Removed setOrderDetails as it's not in context type
  } = useOrderContext();

  const [deliveryAddress, setDeliveryAddress] = useState<AddressFormData | null>(null);
  const [pickupTime, setPickupTime] = useState<string>('');
  const [dineInDateTime, setDineInDateTime] = useState<Date | undefined>(undefined);
  const [dineInTime, setDineInTime] = useState<string>('');
  const [dineInGuests, setDineInGuests] = useState<string>('');
  const [dineInReservationType, setDineInReservationType] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [codeToValidate, setCodeToValidate] = useState('');
  // Rename selectedZone to selectedZoneId and type it correctly
  const [selectedZoneId, setSelectedZoneId] = useState<Id<"deliveryZones"> | undefined>();
  const [deliveryFee, setDeliveryFee] = useState<number>(0); // Keep fee in kobo
  const [isPeakHour, setIsPeakHour] = useState<boolean>(false);

  // REMOVE Outdated Query:
  // const zoneData = useQuery(
  //   api.branches.getDeliveryZones,
  //   selectedBranchId ? { branchId: selectedBranchId } : 'skip'
  // );

  const branch = useQuery(
    api.branches.getById,
    selectedBranchId ? { branchId: selectedBranchId } : 'skip'
  );

  const createOrder = useMutation(api.orders.createOrder);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  // Remove useAction hooks for Paystack
  // const initializePaystack = useAction(api.paystack.initializeTransaction);
  // const initializeSharedCartPayment = useAction(api.paystack.initializeSharedCartTransaction);

  const validationResult = useQuery(
    api.promotions.validatePromoCode,
    codeToValidate
      ? { code: codeToValidate, currentCartTotalKobo: Math.round(cartTotal * 100) }
      : 'skip'
  ) as ValidatedPromo | undefined | null;
  const isPromoLoading = codeToValidate !== '' && validationResult === undefined;

  const handleApplyPromoCode = () => {
    if (!promoCodeInput) return;
    setCodeToValidate(promoCodeInput);
  };
  const handleRemovePromoCode = () => {
    setPromoCodeInput('');
    setCodeToValidate('');
  };

  const appliedDiscountKobo =
    validationResult && 'promoId' in validationResult
      ? validationResult.calculatedDiscount
      : 0;
  const finalTotalKobo = Math.max(0, Math.round(cartTotal * 100) - appliedDiscountKobo);
  // No need for finalTotal in dollars here, work with kobo
  // const finalTotal = finalTotalKobo / 100;

  // Calculate final total including delivery fee (all in kobo)
  const finalTotalWithDeliveryKobo = finalTotalKobo + deliveryFee;

  const isUserLoading = !isUserLoaded;
  const isBranchLoading = !!selectedBranchId && branch === undefined;
  const isOrderContextMissing =
    !selectedBranchId || !selectedOrderType || !cartItems || cartItems.length === 0;
  const isLoadingPage = isUserLoading || isBranchLoading;

  const requiresAddress = selectedOrderType === 'Delivery';
  const requiresPickupTime = selectedOrderType === 'Take-out';
  const requiresDineInDetails = selectedOrderType === 'Dine-In';

  // Update isReadyForPayment validation
  const isReadyForPayment =
    isUserLoaded &&
    user &&
    selectedBranchId &&
    selectedOrderType &&
    customerName &&
    cartItems && cartItems.length > 0 &&
    branch &&
    !isPromoLoading &&
    (!requiresAddress || (deliveryAddress && selectedZoneId)) && // Ensure zone is selected for delivery
    (!requiresPickupTime || pickupTime) &&
    (!requiresDineInDetails ||
      (dineInDateTime && dineInTime && dineInGuests && dineInReservationType)) &&
    (!codeToValidate ||
      (validationResult && !('error' in validationResult)));

  // Effect for redirecting if context is missing
  useEffect(() => {
    if (isOrderContextMissing && !isLoadingPage) { // Check isLoadingPage to prevent premature redirect
      router.replace('/home');
      toast({ title: "Missing Order Details", description: "Please select a branch, order type, and add items to your cart.", variant: "destructive" });
    }
  }, [isOrderContextMissing, isLoadingPage, router, toast]);

  // Effect for setting peak hour
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    // Example: Peak hours 6 PM - 9 PM (18:00 - 20:59)
    setIsPeakHour(hour >= 18 && hour < 21);
    // Re-calculate delivery fee if zone is already selected when peak status changes
    // This is a basic implementation; might need adjustment if a zone is selected *during* the checkout across a peak boundary
  }, []); // Runs once on mount

  // Handler for DeliveryZoneSelector
  const handleZoneSelect = (zone: Doc<"deliveryZones">) => {
    setSelectedZoneId(zone._id);
    // Calculate and set fee in kobo
    const fee = isPeakHour ? zone.peakFee : zone.baseFee;
    setDeliveryFee(fee);
  };

  const handlePayment = async () => {
    if (!isReadyForPayment) {
      let description =
        'Please fill all required fields.';
       if (isPromoLoading) {
         description = 'Please wait for promo code validation to complete.';
       } else if (validationResult && 'error' in validationResult) {
         description = `Please resolve the promo code issue: ${String(validationResult.error)}`;
       } else if (!user) {
         description = 'Please ensure you are logged in.';
       } else if (requiresAddress && !deliveryAddress) {
            description = 'Please enter your delivery address.';
       } else if (requiresAddress && !selectedZoneId) {
            description = 'Please select a delivery zone.';
       } else if (requiresPickupTime && !pickupTime) {
            description = 'Please select a pickup time.';
       } else if (requiresDineInDetails && (!dineInDateTime || !dineInTime || !dineInGuests || !dineInReservationType)) {
           description = 'Please fill in all dine-in details.';
       } else if (!customerName) {
            description = 'Please enter your name.';
       } else if (!cartItems || cartItems.length === 0) {
           description = 'Your cart is empty.';
       }
      toast({ title: 'Cannot Proceed', description, variant: 'destructive' });
      return;
    }
    // ... rest of the initial checks (user email) ...
    if (!user?.primaryEmailAddress?.emailAddress) {
      toast({
        title: 'User Error',
        description: 'Could not find user email for payment.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    let orderId: Id<"orders"> | null = null; // Keep track of created order ID

    try {
      // Construct delivery address (only if needed)
      const completeDeliveryAddress = requiresAddress && deliveryAddress
        ? {
          street: deliveryAddress.street ?? '',
          customerPhone: deliveryAddress.customerPhone ?? '',
          recipientName: deliveryAddress.isOrderingForSomeoneElse ? deliveryAddress.recipientName : undefined,
          recipientPhone: deliveryAddress.isOrderingForSomeoneElse ? deliveryAddress.recipientPhone : undefined,
          // zoneName is no longer needed here, derived from deliveryZoneId in backend
          // deliveryFee is also handled in backend based on zoneId
        }
        : undefined;

      // ... construct dineInDetails ...
      const dineInDetails = requiresDineInDetails && dineInDateTime
        ? {
          dineInDateTime: combineDateAndTime(
            dineInDateTime,
            dineInTime
          ).getTime(),
          dineInGuests: parseInt(dineInGuests, 10),
          dineInReservationType,
        }
        : {};


      const validatedOrderType = selectedOrderType as "Delivery" | "Dine-In" | "Take-out";

      // Construct the core order data for the mutation
      const orderDataForMutation = {
        branchId: selectedBranchId!,
        userId: user.id as Id<'users'>, // Use Clerk user ID directly if your backend expects it
        customerName,
        items: cartItems.map((item: CartItem) => ({
          menuItemId: item._id as Id<'menuItems'>, // Use item._id for menuItemId
          quantity: item.quantity,
          // Include price details if needed by backend, otherwise calculated there
        })),
        orderType: validatedOrderType,
        appliedPromoId: (validationResult && 'promoId' in validationResult) ? validationResult.promoId : undefined,
        // Add delivery/pickup/dine-in specifics
        ...(validatedOrderType === 'Delivery' && {
           deliveryAddress: completeDeliveryAddress,
           deliveryZoneId: selectedZoneId // Pass the selected zone ID
        }),
        ...(validatedOrderType === 'Take-out' && {
           pickupTime: parsePickupTime(pickupTime)
        }),
        ...(validatedOrderType === 'Dine-In' && dineInDetails),
        // Note: totalAmount will be calculated securely in the backend mutation
      };

      // 1. Create the Order in Convex (status 'Pending Payment')
      orderId = await createOrder(orderDataForMutation as any); // Use 'as any' carefully or refine type

      if (!orderId) {
        throw new Error("Failed to create order ID.");
      }

      console.log('Order created with ID:', orderId);
      console.log('Final total including delivery (kobo):', finalTotalWithDeliveryKobo);

      // 2. Initialize Paystack Transaction
      const amountToPayKobo = finalTotalWithDeliveryKobo;
      console.log('Initializing Paystack payment for', amountToPayKobo, 'Kobo');

      // *** IMPORTANT: Verify the exact arguments required by your server action ***
      // The linter suggests it only expects { orderId }, which seems incorrect.
      // Keeping the full args commented out for reference.
      /*
      const paymentInputArgs = {
        email: user.primaryEmailAddress.emailAddress,
        amount: amountToPayKobo,
        metadata: {
          orderId: orderId.toString(),
          userId: user.id,
          customerName: customerName,
          orderType: validatedOrderType,
          cancel_action: `${window.location.origin}/checkout`
        },
        callback_url: `${window.location.origin}/order-confirmation?orderId=${orderId.toString()}`
      };
      console.log("Paystack input:", paymentInputArgs);
      */

      // FIXED: Passing only orderId based on linter error - VERIFY THIS!
      const paymentInput = { orderId: orderId };
      console.log("Paystack input (based on linter):", paymentInput);

      // *** IMPORTANT: Verify the actual return type of your server action ***
      // Casting to PaystackResult type based on combined linter feedback/assumptions
      const paymentResult = await initializePaystackTransaction(paymentInput) as PaystackResult;
      console.log("Paystack result:", paymentResult);

      // Check for error first
      if (paymentResult?.error) {
          throw new Error(paymentResult.error);
      }
      // FIXED: Check authorizationUrl directly on the result object (camelCase)
      const authorizationUrl = paymentResult?.authorizationUrl; 
      if (!authorizationUrl) {
          throw new Error('Paystack authorization URL not found in the server action result. Verify action return type.');
      }
      
      console.log('Redirecting to Paystack:', authorizationUrl);
      router.push(authorizationUrl);

      // Clear cart *after* successfully redirecting to Paystack
      // clearCart(); // Consider clearing cart on successful payment confirmation instead

    } catch (error: any) {
      console.error("Checkout process failed:", error);
      toast({
        title: 'Checkout Error',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });

      // Optional: If order was created but payment init failed, update status?
      if (orderId) {
        try {
            // await updateOrderStatus({ orderId, status: 'Payment Failed' }); // Or a different status
             console.warn(`Order ${orderId} created but payment initialization failed. Consider manual review or status update.`);
        } catch (statusError) {
             console.error("Failed to update order status after payment init failure:", statusError);
        }
      }

      setIsSubmitting(false); // Re-enable button on failure
    }
    // No need to set submitting false here if redirecting
  };

  // Helper function to format currency
  const formatCurrency = (amountKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amountKobo / 100); // Convert kobo to Naira
  };

  // Helper function to parse pickup time string into timestamp
  function parsePickupTime(time: string): number {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date(); // Use today's date
      date.setHours(hours, minutes, 0, 0);
      return date.getTime(); // Return Unix timestamp in milliseconds
  }

  // Helper function to combine Date object and time string into timestamp
  function combineDateAndTime(date: Date, time: string): Date {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
  }

  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isOrderContextMissing) {
    // Handled by useEffect redirect, show minimal loading or null
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Menu</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Checkout</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Order Details & Inputs */}
        <div className="md:col-span-2 space-y-6">
        
          {/* Customer Name */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="customerName">Full Name</Label>
              <Input 
                id="customerName"
                placeholder="Enter your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isSubmitting}
              />
              {/* Add email display? User is already logged in */} 
            </CardContent>
          </Card>
          
          {/* Order Type Specific Inputs */}
          {selectedOrderType === 'Delivery' && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
                <CardDescription>Select your zone and enter your address.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delivery Zone Selection - Wrap in scrollable div */}
                <div>
                    <Label>Delivery Zone</Label>
                    <div className="mt-1 max-h-72 overflow-y-auto border rounded-md p-1"> {/* Scroll wrapper */}
                       <DeliveryZoneSelector 
                           selectedZoneId={selectedZoneId} 
                           onZoneSelect={handleZoneSelect}
                           disabled={isSubmitting}
                       />
                    </div>
                    {selectedZoneId && deliveryFee > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">Delivery Fee: {formatCurrency(deliveryFee)}</p>
                    )}
                </div>
                
                {/* Address Form */}
                <div>
                    <Label>Address & Phone</Label>
                    <AddressForm 
                        onSubmit={setDeliveryAddress} 
                        disabled={isSubmitting} 
                        // Pass initial data if available (e.g., from user profile)
                        // initialData={...} 
                    />
                </div>
              </CardContent>
            </Card>
          )}

          {selectedOrderType === 'Take-out' && (
            <Card>
              <CardHeader>
                 <CardTitle>Pickup Details</CardTitle>
                 <CardDescription>When would you like to pick up your order?</CardDescription>
              </CardHeader>
              <CardContent>
                 <Label htmlFor="pickupTime">Pickup Time</Label>
                 <Input 
                   id="pickupTime"
                   type="time" 
                   value={pickupTime} 
                   onChange={(e) => setPickupTime(e.target.value)} 
                   disabled={isSubmitting}
                 />
                 {/* Add note about branch hours? */} 
              </CardContent>
            </Card>
          )}

          {selectedOrderType === 'Dine-In' && (
            <Card>
              <CardHeader>
                 <CardTitle>Dine-In Reservation</CardTitle>
                 <CardDescription>Provide details for your dine-in experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                   <Label htmlFor="dineInDate">Date</Label>
                   <DatePicker 
                     selected={dineInDateTime} 
                     onSelect={setDineInDateTime} 
                     disabled={isSubmitting}
                   />
                 </div>
                 <div>
                   <Label htmlFor="dineInTime">Time</Label>
                   <Input 
                     id="dineInTime" 
                     type="time" 
                     value={dineInTime} 
                     onChange={(e) => setDineInTime(e.target.value)} 
                     disabled={isSubmitting}
                   />
                 </div>
                 <div>
                   <Label htmlFor="dineInGuests">Number of Guests</Label>
                   <Input 
                     id="dineInGuests" 
                     type="number" 
                     min="1" 
                     value={dineInGuests} 
                     onChange={(e) => setDineInGuests(e.target.value)} 
                     placeholder="e.g., 2"
                     disabled={isSubmitting}
                   />
                 </div>
                 <div>
                   <Label htmlFor="dineInReservationType">Occasion (Optional)</Label>
                    <Select 
                        value={dineInReservationType} 
                        onValueChange={setDineInReservationType}
                        disabled={isSubmitting}
                    > 
                       <SelectTrigger id="dineInReservationType">
                           <SelectValue placeholder="Select occasion type" />
                       </SelectTrigger>
                       <SelectContent>
                           <SelectItem value="casual">Casual Dining</SelectItem>
                           <SelectItem value="birthday">Birthday</SelectItem>
                           <SelectItem value="anniversary">Anniversary</SelectItem>
                           <SelectItem value="business">Business Meeting</SelectItem>
                           <SelectItem value="other">Other</SelectItem>
                       </SelectContent>
                   </Select>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Order Summary & Payment */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
               {cartItems?.map((item: CartItem) => (
                 <div key={item.cartItemId || item._id} className="flex justify-between text-sm">
                   <span>{item.quantity}x {item.name}</span>
                   <span>{formatCurrency(item.price * item.quantity)}</span>
                 </div>
               ))}
               <Separator />
               <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Math.round(cartTotal * 100))}</span>
               </div>
               {/* Promo Code Section */}
               {/* ... promo code display/input ... */} 
               {/* Delivery Fee */}
               {selectedOrderType === 'Delivery' && deliveryFee > 0 && (
                   <div className="flex justify-between text-sm text-muted-foreground">
                       <span>Delivery Fee</span>
                       <span>{formatCurrency(deliveryFee)}</span>
                   </div>
               )}
               {/* Discount */}
               {appliedDiscountKobo > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({promoCodeInput || codeToValidate})</span>
                    <span>-{formatCurrency(appliedDiscountKobo)}</span>
                  </div>
                )}
               <Separator />
               <div className="flex justify-between font-semibold text-lg">
                 <span>Total</span>
                 <span>{formatCurrency(finalTotalWithDeliveryKobo)}</span>
               </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handlePayment} 
                disabled={!isReadyForPayment || isSubmitting}
              >
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
               </Button>
            </CardFooter>
          </Card>
          
          {/* Promo Code Input Card */}
          <Card>
              <CardHeader>
                  <CardTitle>Promo Code</CardTitle>
                  <CardDescription>Have a code? Enter it below.</CardDescription>
              </CardHeader>
              <CardContent>
                  {codeToValidate && validationResult && 'promoId' in validationResult ? (
                      <div className="flex justify-between items-center p-2 bg-green-100 rounded-md">
                          <span className="text-sm text-green-700 font-medium">Code applied: {codeToValidate}</span>
                          <Button variant="ghost" size="icon" onClick={handleRemovePromoCode} className="h-6 w-6 text-green-700">
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ) : (
                      <div className="flex gap-2">
                          <Input 
                              placeholder="Enter code" 
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                              disabled={isSubmitting || isPromoLoading}
                          />
                          <Button 
                              onClick={handleApplyPromoCode}
                              disabled={!promoCodeInput || isSubmitting || isPromoLoading}
                              variant="secondary"
                          >
                              {isPromoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                          </Button>
                      </div>
                  )}
                  {isPromoLoading && <p className="text-xs text-muted-foreground mt-1">Validating...</p>}
                  {validationResult && 'error' in validationResult && (
                      <p className="text-xs text-red-600 mt-1">Error: {String(validationResult.error)}</p>
                  )}
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Ensure helper functions are defined or imported correctly
// function parsePickupTime(...) - already defined
// function combineDateAndTime(...) - already defined
// function formatCurrency(...) - already defined