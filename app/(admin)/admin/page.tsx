'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs'; // Adjust the import path based on your project setup
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const orders = useQuery(api.orders.getOrdersAdmin);

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!orders) {
    return <div className="flex justify-center items-center min-h-screen">Loading orders...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Admin Orders</h1>
      {orders.length === 0 ? (
        <div className="text-muted-foreground">No orders found.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="border rounded-md p-4">
              <p>Order ID: {order._id}</p>
              {order._type === "order" ? (
                <>
                  <p>Type: Regular Order</p>
                  <p>Status: {order.status}</p>
                  <p>Total Amount: ${(order.totalAmount / 100).toFixed(2)}</p>
                  <Button variant="link" onClick={() => router.push(`/order-details/${order._id}`)}>
                    View Details
                  </Button>
                </>
              ) : (
                <>
                  <p>Type: Shared Cart</p>
                  <p>Status: {order.status}</p>
                  <p>Total Amount: ${(order.totalAmount / 100).toFixed(2)}</p>
                  <p>Initiator Email: {order.userEmail}</p>
                  <Button variant="link" onClick={() => router.push(`/shared-cart/${order._id}`)}>
                    View Details
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}