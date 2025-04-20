'use client';

import React, { useState, useEffect } from 'react';
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
import AddressForm from '@/components/AddressForm';
import { type AddressFormData } from '@/components/AddressForm';
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
import { type Id } from '@/convex/_generated/dataModel';
// Import the server action directly
import { initializePaystackTransaction } from '@/app/actions/initializePaystackTransaction';

// Define proper interfaces to avoid using 'any'
interface DeliveryAddress {
  street: string;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
}

interface OrderItem {
  menuItemId: Id<'menuItems'>;
  quantity: number;
}

interface OrderPayload {
  branchId: Id<'branches'>;
  userId: Id<'users'>;
  customerName: string;
  items: OrderItem[];
  orderType: "Delivery" | "Dine-In" | "Take-out";
  appliedPromoId?: Id<'promotions'>;
  deliveryAddress?: DeliveryAddress;
  pickupTime?: number;
  dineInDateTime?: number;
  dineInGuests?: number;
  dineInReservationType?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded: isUserLoaded } = useUser();
  const {
    selectedBranchId,
    selectedOrderType,
    cartItems,
    cartTotal,
    resetOrderFlow,
    activeSharedCartId
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
  );
  const isPromoLoading = codeToValidate !== '' && validationResult === undefined;

  const handleApplyPromoCode = () => {
    if (!promoCodeInput) return;
    setCodeToValidate(promoCodeInput);
  };
  const handleRemovePromoCode = () => {
    setPromoCodeInput('');
    setCodeToValidate('');
  };

  const appliedDiscount =
    validationResult && 'promoId' in validationResult
      ? validationResult.calculatedDiscount
      : 0;
  const finalTotalKobo = Math.max(0, Math.round(cartTotal * 100) - appliedDiscount);
  const finalTotal = finalTotalKobo / 100;

  const isUserLoading = !isUserLoaded;
  const isBranchLoading = !!selectedBranchId && branch === undefined;
  const isOrderContextMissing =
    !selectedBranchId || !selectedOrderType || cartItems.length === 0;
  const isLoadingPage = isUserLoading || isBranchLoading;

  const requiresAddress = selectedOrderType === 'Delivery';
  const requiresPickupTime = selectedOrderType === 'Take-out';
  const requiresDineInDetails = selectedOrderType === 'Dine-In';

  const isReadyForPayment =
    isUserLoaded &&
    user &&
    selectedBranchId &&
    selectedOrderType &&
    customerName &&
    cartItems.length > 0 &&
    branch &&
    !isPromoLoading &&
    (!requiresAddress || deliveryAddress) &&
    (!requiresPickupTime || pickupTime) &&
    (!requiresDineInDetails ||
      (dineInDateTime && dineInTime && dineInGuests && dineInReservationType)) &&
    (!codeToValidate ||
      (validationResult && !('error' in validationResult)));

  // Fix for Issue 2: Move useEffect to the top level
  useEffect(() => {
    if (isOrderContextMissing) {
      router.replace('/home');
    }
  }, [isOrderContextMissing, router]);

  const handlePayment = async () => {
    if (!isReadyForPayment) {
      let description =
        'Please select branch, order type, and fill all required fields (Address/Time/Dine-In Details).';
      if (isPromoLoading) {
        description = 'Please wait for promo code validation to complete.';
      } else if (validationResult && 'error' in validationResult) {
        description = `Please resolve the promo code issue: ${validationResult.error}`;
      } else if (!user) {
        description = 'Please ensure you are logged in.';
      }
      toast({ title: 'Cannot Proceed', description, variant: 'destructive' });
      return;
    }
    if (!user?.primaryEmailAddress?.emailAddress) {
      toast({
        title: 'User Error',
        description: 'Could not find user email for payment.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    let orderId: Id<"orders"> | null = null;

    try {
      const completeDeliveryAddress = requiresAddress && deliveryAddress
        ? {
          street: deliveryAddress.street,
          customerPhone: deliveryAddress.customerPhone,
          recipientName: deliveryAddress.isOrderingForSomeoneElse
            ? deliveryAddress.recipientName
            : undefined,
          recipientPhone: deliveryAddress.isOrderingForSomeoneElse
            ? deliveryAddress.recipientPhone
            : undefined,
        }
        : undefined;

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

      // Ensure selectedOrderType is one of the allowed values before assigning
      const validatedOrderType = selectedOrderType as "Delivery" | "Dine-In" | "Take-out";

      const orderPayload: OrderPayload = {
        branchId: selectedBranchId!,
        userId: user.id as Id<'users'>, // Type assertion for Clerk user ID
        customerName,
        items: cartItems.map((item) => ({
          menuItemId: item._id as Id<'menuItems'>, // Corrected from item.id to item._id
          quantity: item.quantity,
          // Add customization details if applicable
        })),
        orderType: validatedOrderType,
        appliedPromoId: validationResult && 'promoId' in validationResult ? validationResult.promoId : undefined,
        deliveryAddress: completeDeliveryAddress,
        pickupTime: requiresPickupTime && pickupTime ? parsePickupTime(pickupTime) : undefined,
        ...dineInDetails,
      };

      console.log('Creating order with payload:', orderPayload);
      orderId = await createOrder(orderPayload);
      console.log('Order created successfully with ID:', orderId);

      // --- Initiate Paystack Payment using the server action --- 
      if (orderId) {
        console.log('Initializing payment for order:', orderId);
        const paymentResult = await initializePaystackTransaction({ orderId });

        if (paymentResult?.authorizationUrl) {
          console.log('Redirecting to Paystack:', paymentResult.authorizationUrl);
          // Redirect user to Paystack's payment page
          window.location.href = paymentResult.authorizationUrl;
          // Optionally clear cart/reset flow here or wait for webhook confirmation
          // resetOrderFlow(); 
        } else {
          throw new Error('Failed to get Paystack authorization URL.');
        }
      } else {
        throw new Error('Order ID not received after creation.');
      }

    } catch (error: any) {
      console.error('Failed to create order or initiate payment:', error);
      // Attempt to revert order creation if payment initiation failed?
      // This is complex and depends on your desired transactional behavior.
      // If orderId exists, maybe update its status to 'Payment Failed'
      if (orderId) {
        try {
          // Use the mutation hook to update status to 'Cancelled' as 'Payment Failed' is not a valid status
          await updateOrderStatus({ orderId, status: 'Cancelled' });
        } catch (updateError) {
          console.error(`Failed to update order ${orderId} status after payment error:`, updateError);
        }
      }

      toast({
        title: 'Error',
        description: `An error occurred: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
      setIsSubmitting(false);
    }
  };

  // Function to parse HH:MM time string into minutes past midnight
  function parsePickupTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }

  if (isLoadingPage) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isOrderContextMissing) {
    // No conditional hook here anymore, we moved it to the top level
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/home">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <Slash className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Checkout</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Order Card */}
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Order</CardTitle>
            <CardDescription>
              Review your order details before proceeding to payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="space-y-2">
              <h3 className="font-semibold">Summary</h3>
              <Separator />
              <p>
                <strong>Branch:</strong> {branch?.name ?? '...'}
              </p>
              <p>
                <strong>Order Type:</strong> {selectedOrderType}
              </p>
              <p>
                <strong>Customer Email:</strong>{' '}
                {user?.primaryEmailAddress?.emailAddress ??
                  'Loading user info...'}
              </p>
              {customerName && (
                <p>
                  <strong>Customer Name:</strong> {customerName}
                </p>
              )}
              {selectedOrderType === 'Delivery' &&
                deliveryAddress?.customerPhone && (
                  <p>
                    <strong>Phone:</strong> {deliveryAddress.customerPhone}
                  </p>
                )}
              {selectedOrderType === 'Delivery' &&
                deliveryAddress?.isOrderingForSomeoneElse &&
                deliveryAddress.recipientName && (
                  <p>
                    <strong>Recipient Name:</strong>{' '}
                    {deliveryAddress.recipientName}
                  </p>
                )}
              {selectedOrderType === 'Delivery' &&
                deliveryAddress?.isOrderingForSomeoneElse &&
                deliveryAddress.recipientPhone && (
                  <p>
                    <strong>Recipient Phone:</strong>{' '}
                    {deliveryAddress.recipientPhone}
                  </p>
                )}
              {selectedOrderType === 'Dine-In' &&
                dineInDateTime &&
                dineInTime && (
                  <p>
                    <strong>Reservation Time:</strong>{' '}
                    {combineDateAndTime(
                      dineInDateTime,
                      dineInTime
                    ).toLocaleString()}
                  </p>
                )}
              {selectedOrderType === 'Dine-In' && dineInGuests && (
                <p>
                  <strong>Number of Guests:</strong> {dineInGuests}
                </p>
              )}
              {selectedOrderType === 'Dine-In' && dineInReservationType && (
                <p>
                  <strong>Reservation Type:</strong>{' '}
                  {dineInReservationType}
                </p>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customer-name">Your Name</Label>
              <Input
                id="customer-name"
                type="text"
                placeholder="Enter your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h3 className="font-semibold">Items</h3>
              <Separator />
              {cartItems.map((item) => (
                <div
                  key={item._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {validationResult && 'promoId' in validationResult && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Promo Code: {validationResult.code}</span>
                  <span>
                    -${(validationResult.calculatedDiscount / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center font-semibold">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <h3 className="font-semibold">Promo Code</h3>
              <Separator />
              {!(validationResult && 'promoId' in validationResult) ? (
                <div className="flex gap-2 items-start">
                  <div className="flex-grow space-y-1">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCodeInput}
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        if (validationResult && 'error' in validationResult) {
                          setCodeToValidate('');
                        }
                      }}
                      disabled={isPromoLoading}
                      aria-describedby="promo-error"
                    />
                    {validationResult && 'error' in validationResult && (
                      <p id="promo-error" className="text-sm text-red-600">
                        {validationResult.error}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleApplyPromoCode}
                    disabled={
                      !promoCodeInput ||
                      isPromoLoading ||
                      promoCodeInput === codeToValidate
                    }
                    variant="secondary"
                    className="flex-shrink-0"
                  >
                    {isPromoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between items-center p-2 border rounded-md bg-secondary">
                  <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                    <Tag size={16} /> {validationResult.code} Applied (
                    -${(appliedDiscount / 100).toFixed(2)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemovePromoCode}
                    className="h-6 w-6"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>

            {/* Address / Pickup / Dine-In */}
            <div className="space-y-4">
              <h3 className="font-semibold">
                {selectedOrderType === 'Delivery'
                  ? 'Delivery Address'
                  : selectedOrderType === 'Take-out'
                    ? 'Pickup Details'
                    : 'Dine-In Details'}
              </h3>
              <Separator />
              {selectedOrderType === 'Delivery' && (
                <AddressForm
                  onSubmit={setDeliveryAddress}
                  submitButtonText="Save Address"
                />
              )}
              {selectedOrderType === 'Take-out' && (
                <div className="space-y-2">
                  <Label htmlFor="pickup-time">
                    Estimated Pickup Time (HH:MM)
                  </Label>
                  <Input
                    id="pickup-time"
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    required
                  />
                </div>
              )}
              {selectedOrderType === 'Dine-In' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dine-in-datetime">
                      Reservation Date
                    </Label>
                    <DatePicker
                      id="dine-in-datetime"
                      selected={dineInDateTime}
                      onChange={(date: Date | undefined) =>
                        setDineInDateTime(date)
                      }
                      dateFormat="MMMM d, yyyy"
                      placeholderText="Select reservation date"
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dine-in-time">Reservation Time</Label>
                    <Input
                      id="dine-in-time"
                      type="time"
                      value={dineInTime}
                      onChange={(e) => setDineInTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dine-in-guests">
                      Number of Guests
                    </Label>
                    <Input
                      id="dine-in-guests"
                      type="number"
                      min="1"
                      placeholder="e.g., 2"
                      value={dineInGuests}
                      onChange={(e) => setDineInGuests(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dine-in-type">
                      Type of Reservation
                    </Label>
                    <Select
                      onValueChange={setDineInReservationType}
                      value={dineInReservationType}
                      required
                    >
                      <SelectTrigger id="dine-in-type">
                        <SelectValue placeholder="Select reservation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Birthday">Birthday</SelectItem>
                        <SelectItem value="Anniversary">Anniversary</SelectItem>
                        <SelectItem value="Business">
                          Business Meeting
                        </SelectItem>
                        <SelectItem value="Other">
                          Other (Specify if needed)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Back to Menu
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!isReadyForPayment || isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? 'Processing...'
                : `Proceed to Payment ($${finalTotal.toFixed(2)})`}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}