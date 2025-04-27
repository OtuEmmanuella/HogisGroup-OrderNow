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
import { DatePicker, type DatePickerProps } from '@/components/ui/datepicker';
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
         description = `Please resolve the promo code issue: ${validationResult.error}`;
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
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId, // Assuming cart item has menuItemId
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
      const paymentInitializationResult = await initializePaystackTransaction({
        email: user.primaryEmailAddress.emailAddress,
        amount: finalTotalWithDeliveryKobo, // Send amount in kobo
        metadata: {
          orderId: orderId, // Pass orderId in metadata
          userId: user.id,
          customerName: customerName,
          orderType: validatedOrderType,
          cancel_action: `${window.location.origin}/checkout` // Redirect back to checkout on cancel/failure
        },
        callback_url: `${window.location.origin}/order-confirmation?orderId=${orderId}` // Redirect to confirmation on success
      });

      if (paymentInitializationResult.error || !paymentInitializationResult.data) {
        throw new Error(paymentInitializationResult.error || 'Failed to initialize Paystack transaction.');
      }

      // 3. Redirect user to Paystack
      const authorizationUrl = paymentInitializationResult.data.authorization_url;
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isOrderContextMissing) {
     // This case should ideally be handled by the useEffect redirect,
     // but keep a fallback UI just in case.
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <p>Loading order details or redirecting...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/cart">Cart</BreadcrumbLink> {/* Assuming /cart exists */}
          </BreadcrumbItem>
           <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Checkout</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Order Details & Forms */}
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
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
             </CardContent>
          </Card>

          {/* Order Type Specific Inputs */}
          {selectedOrderType === 'Delivery' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressForm
                    onSubmit={setDeliveryAddress}
                  />
                </CardContent>
              </Card>
              {/* Delivery Zone Selector - Conditional Rendering */}
              {deliveryAddress && ( // Show only after address is entered? Or always if type is Delivery? Let's show always.
                 <Card>
                    <CardHeader>
                       <CardTitle>Delivery Zone</CardTitle>
                       <CardDescription>Select the zone for your delivery address.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <DeliveryZoneSelector
                         selectedZoneId={selectedZoneId} // Pass selected ID
                         isPeakHour={isPeakHour}        // Pass peak hour status
                         onZoneSelect={handleZoneSelect} // Handle selection update
                       />
                    </CardContent>
                 </Card>
              )}
            </>
          )}

          {selectedOrderType === 'Take-out' && (
            <Card>
              <CardHeader>
                <CardTitle>Pickup Time</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="pickupTime">Select Time</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                />
              </CardContent>
            </Card>
          )}

          {selectedOrderType === 'Dine-In' && (
            <Card>
              <CardHeader>
                <CardTitle>Dine-In Reservation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                   <Label htmlFor="dineInDate">Date</Label>
                   <DatePicker date={dineInDateTime} setDate={setDineInDateTime} />
                </div>
                 <div>
                   <Label htmlFor="dineInTime">Time</Label>
                   <Input
                     id="dineInTime"
                     type="time"
                     value={dineInTime}
                     onChange={(e) => setDineInTime(e.target.value)}
                     required
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
                     placeholder="e.g., 4"
                     required
                   />
                 </div>
                 <div>
                    <Label htmlFor="dineInReservationType">Reservation Type</Label>
                     <Select value={dineInReservationType} onValueChange={setDineInReservationType} required>
                       <SelectTrigger id="dineInReservationType">
                         <SelectValue placeholder="Select type (e.g., Birthday, Standard)" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Standard">Standard</SelectItem>
                         <SelectItem value="Birthday">Birthday</SelectItem>
                         <SelectItem value="Anniversary">Anniversary</SelectItem>
                         <SelectItem value="Business">Business Meeting</SelectItem>
                         <SelectItem value="Other">Other</SelectItem>
                       </SelectContent>
                     </Select>
                 </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column: Order Summary */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              {branch && <CardDescription>Branch: {branch.name}</CardDescription>}
              <CardDescription>Order Type: {selectedOrderType}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.cartItemId || item.menuItemId} className="flex justify-between items-center">
                  <span>{item.name} x {item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity * 100)}</span> {/* Assume price is in Naira */}
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal * 100)}</span>
              </div>

              {/* Promo Code Section */}
               <div className="space-y-2 pt-2">
                 <Label htmlFor="promoCode">Promo Code</Label>
                 <div className="flex space-x-2">
                    <Input
                       id="promoCode"
                       placeholder="Enter code"
                       value={promoCodeInput}
                       onChange={(e) => setPromoCodeInput(e.target.value)}
                       disabled={!!codeToValidate && validationResult && 'promoId' in validationResult} // Disable if valid code applied
                    />
                    {!codeToValidate && (
                       <Button onClick={handleApplyPromoCode} disabled={!promoCodeInput || isPromoLoading}>
                          {isPromoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                       </Button>
                    )}
                    {codeToValidate && (
                       <Button variant="ghost" size="icon" onClick={handleRemovePromoCode}>
                          <X className="h-4 w-4" />
                       </Button>
                    )}
                 </div>
                 {isPromoLoading && <p className="text-sm text-muted-foreground">Validating...</p>}
                 {validationResult && 'error' in validationResult && (
                   <p className="text-sm text-red-600">{validationResult.error}</p>
                 )}
                 {validationResult && 'promoId' in validationResult && (
                   <div className="text-sm text-green-600 flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      <span>
                         Discount Applied: -{formatCurrency(validationResult.calculatedDiscount)} ({(validationResult.description)})
                      </span>
                   </div>
                 )}
               </div>
              {/* End Promo Code Section */}

              {selectedOrderType === 'Delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Select zone'}</span>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                {/* Display final total based on order type */}
                <span>
                   {selectedOrderType === 'Delivery'
                     ? formatCurrency(finalTotalWithDeliveryKobo)
                     : formatCurrency(finalTotalKobo)
                   }
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handlePayment}
                disabled={!isReadyForPayment || isSubmitting || isLoadingPage}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
              </Button>
            </CardFooter>
          </Card>
           {/* Display Branch Info */}
           {branch && (
             <Card>
               <CardHeader>
                 <CardTitle>Branch Details</CardTitle>
               </CardHeader>
               <CardContent>
                 <p><strong>{branch.name}</strong></p>
                 <p>{branch.address}</p>
                 <p>Phone: {branch.contactNumber}</p>
                 {/* Add operating hours if needed */}
               </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}

// Ensure helper functions are defined or imported correctly
// function parsePickupTime(...) - already defined
// function combineDateAndTime(...) - already defined
// function formatCurrency(...) - already defined