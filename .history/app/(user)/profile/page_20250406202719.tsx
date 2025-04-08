'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Function to determine badge variant based on status
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
        case 'Completed': return 'default'; // Or 'success' if you add custom variants
        case 'Received':
        case 'Preparing': 
        case 'Ready for Pickup':
        case 'Out for Delivery': return 'secondary'; // In progress
        case 'Pending Confirmation': return 'outline'; 
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
};

export default function ProfilePage() {
    const { user, isLoaded: isUserLoaded } = useUser();
    const router = useRouter();

    const userId = user?.id;

    const orders = useQuery(
        api.orders.getUserOrders,
        userId ? { userId: userId } : 'skip' // Skip query if userId is not available
    );

    const isLoading = !isUserLoaded || orders === undefined;

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        // Should ideally be handled by layout/middleware, but added as fallback
        return <div className="container mx-auto px-4 py-8">Please log in to view your profile.</div>;
    }

    const handleViewOrder = (orderId: Id<"orders">) => {
        router.push(`/orders/${orderId}`);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
            
            {/* Future sections for profile details, saved addresses etc. */}

            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    {orders === null || orders.length === 0 ? (
                        <p className="text-muted-foreground">You haven't placed any orders yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order._id}>
                                        <TableCell className="font-medium truncate">{order._id}</TableCell>
                                        <TableCell>{format(new Date(order._creationTime), 'PPp')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewOrder(order._id)}>
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 