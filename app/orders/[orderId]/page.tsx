'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

// Define interfaces based on Convex schema
interface DeliveryAddress {
  street: string;
  customerPhone: string;
  recipientName?: string;
  recipientPhone?: string;
}

interface OrderItem {
  menuItemId: Id<'menuItems'>;
  quantity: number;
  unitPrice: number;
  name: string;
  description?: string;
}

interface OrderDetails {
  order: {
    _id: Id<'orders'>;
    status: string;
    createdAt: number;
    totalAmount: number;
    orderType: 'Delivery' | 'Dine-In' | 'Take-out';
    deliveryAddress?: DeliveryAddress;
    pickupTime?: number;
    dineInDateTime?: number;
    dineInGuests?: number;
    dineInReservationType?: string;
  };
  branch: {
    _id: Id<'branches'>;
    name: string;
    address: string;
  };
  items: OrderItem[];
}

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount / 100);
};

// Helper function to get status badge variant
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  const statusMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    'completed': 'default',
    'received': 'secondary',
    'preparing': 'secondary',
    'ready for pickup': 'secondary',
    'out for delivery': 'secondary',
    'pending confirmation': 'outline',
    'cancelled': 'destructive'
  };
  return statusMap[status.toLowerCase()] ?? 'outline';
};

// Helper function to get numerical value for order status comparison
function getStepValue(status: string): number {
  const steps: Record<string, number> = {
    'pending confirmation': 0,
    'received': 1,
    'preparing': 2,
    'ready for pickup': 3,
    'out for delivery': 3,
    'completed': 4,
    'cancelled': -1
  };
  return steps[status.toLowerCase()] ?? -1;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as Id<"orders">;

  const orderDetails = useQuery(api.orders.getOrderDetailsForTracking, { orderId });

  if (orderDetails === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderDetails === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
            <p className="text-lg text-red-600">Order not found or you don&apos;t have permission to view it.</p>
            <Button variant="outline" onClick={() => router.push('/profile')}>
                Go to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, branch, items } = orderDetails as OrderDetails;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {order.status.toLowerCase() === 'completed' && (
          <Link href={`/invoice/${order._id}`} target="_blank">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" /> View Invoice
            </Button>
          </Link>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Order &#35;{order._id.slice(-6)}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Placed on {format(new Date(order.createdAt), 'PPP')}
              </p>
            </div>
            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Branch Information */}
          <div>
            <h3 className="font-semibold mb-2">Branch</h3>
            <p>{branch.name}</p>
            <p className="text-sm text-muted-foreground">{branch.address}</p>
          </div>

          <Separator />

          {/* Order Type & Details */}
          <div>
            <h3 className="font-semibold mb-2">Order Details</h3>
            <p>Type: {order.orderType}</p>
            {order.deliveryAddress && (
              <div className="mt-2">
                <p className="font-medium">Delivery Address:</p>
                <p className="text-sm">{order.deliveryAddress.street}</p>
                <p className="text-sm">Phone: {order.deliveryAddress.customerPhone}</p>
                {order.deliveryAddress.recipientName && (
                  <p className="text-sm">Recipient: {order.deliveryAddress.recipientName}</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-2">Items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p>{formatCurrency(item.unitPrice * item.quantity)}</p>
                    <p className="text-sm text-muted-foreground">
                      @ {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Order Progress */}
      {order.status.toLowerCase() !== 'cancelled' && (
        <Card>
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-muted"></div>
              <div className="space-y-6 relative">
                {['Pending Confirmation', 'Received', 'Preparing', 
                  order.orderType === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup',
                  'Completed'].map((step) => {
                  const isCurrentStep = step.toLowerCase() === order.status.toLowerCase();
                  const isPastStep = getStepValue(order.status) >= getStepValue(step);
                  return (
                    <div key={step} className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full border-2 relative z-10 
                        ${isPastStep ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'} 
                        ${isCurrentStep ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      />
                      <span className={`${isPastStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}