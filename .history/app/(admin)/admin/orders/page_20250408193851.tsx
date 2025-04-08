'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // For status display
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

// Define order statuses based on schema
const ORDER_STATUSES = [
  "Pending Confirmation",
  "Received",
  "Preparing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Cancelled",
] as const; // Use const assertion for literal types
type OrderStatus = typeof ORDER_STATUSES[number];

// Helper component for status update select
function StatusSelector({ orderId, currentStatus }: { orderId: Id<"orders">; currentStatus: OrderStatus }) {
  const { toast } = useToast();
  const updateStatus = useMutation(api.orders.updateOrderStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) return;
    setIsUpdating(true);
    try {
      await updateStatus({ orderId, status: newStatus });
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.` });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({ title: "Error", description: `Failed to update status: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select 
      value={currentStatus} 
      onValueChange={(value: OrderStatus) => handleStatusChange(value)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Change status..." />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map(status => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AdminOrdersPage() {
  // TODO: Add filtering state (branch, status, date range)
  const orders = useQuery(api.orders.getOrdersAdmin, {}); // Pass empty object for now

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Orders</h1>

      {/* TODO: Add Filtering controls here */}
      {/* <div className="flex gap-4 mb-4"> ... filters ... </div> */}

      <Table>
        <TableCaption>A list of recent customer orders.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            {/* <TableHead>Actions</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders === undefined && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          )}
          {orders?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No orders found.
                </TableCell>
             </TableRow>
          )}
          {orders?.map((order) => (
            <TableRow key={order._id}>
              <TableCell className="font-medium">
                <Link href={`/orders/${order._id}`} target="_blank" className='hover:underline'>
                  {order._id.substring(0, 8)}...
                </Link>
              </TableCell>
              <TableCell>{new Date(order._creationTime).toLocaleDateString()}</TableCell>
              <TableCell>{order.branchName}</TableCell>
              <TableCell>{order.userEmail}</TableCell>
              <TableCell><Badge variant="outline">{order.orderType}</Badge></TableCell>
              <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
              <TableCell>
                <StatusSelector orderId={order._id} currentStatus={order.status as OrderStatus} />
              </TableCell>
               {/* <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/orders/${order._id}`} target="_blank">
                          <Eye className="h-4 w-4" /> 
                      </Link>
                    </Button>
              </TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 