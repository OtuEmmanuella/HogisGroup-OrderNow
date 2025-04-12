'use client';

import React, { useState } from 'react';
import { useUser, UserProfile } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Loader2, MessageSquare, RefreshCw, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { toast } from 'sonner';
import { useOrderContext } from '@/context/OrderContext'; // Import order context for addToCart

// Define an interface for the items returned by the reorder mutation
interface ReorderItem {
    _id: Id<"menuItems">;
    name: string;
    price: number;
    quantity: number;
}

// Function to determine badge variant based on status
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status.toLowerCase()) {
        case 'completed': return 'default';
        case 'received':
        case 'preparing':
        case 'ready for pickup':
        case 'out for delivery': return 'secondary'; // In progress
        case 'pending confirmation': return 'outline';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
};

// Helper to format currency (assuming kobo/cents)
const formatCurrency = (amount: number) => {
    return `₦${(amount / 100).toFixed(2)}`;
}

export default function ProfilePage() {
    const { user, isLoaded: isUserLoaded } = useUser();
    const router = useRouter();
    const [feedbackOrderId, setFeedbackOrderId] = useState<Id<"orders"> | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackRating, setFeedbackRating] = useState<number>(5); // Default rating of 5
    // Placeholder states/mutations - replace with actual Convex calls later
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [isReordering, setIsReordering] = useState<Id<"orders"> | null>(null);
    const submitFeedback = useMutation(api.feedback.submitFeedback);
    const reorderItemsMutation = useMutation(api.orders.reorderItems);
    const { addToCart, activeSharedCartId } = useOrderContext(); // Get addToCart

    const userId = user?.id;

    const orders = useQuery(
        api.orders.getUserOrders,
        userId ? { userId: userId } : 'skip'
    );
    const allFeedback = useQuery(api.feedback.getFeedbackForUserOrders, userId ? { userId } : 'skip');
    const feedbackSubmittedOrderIds = new Set(allFeedback?.map((f: Doc<"feedback">) => f.orderId) ?? []);

    const isLoading = !isUserLoaded || orders === undefined || allFeedback === undefined;

    const handleFeedbackSubmit = async () => {
        if (!feedbackOrderId || !feedbackText.trim()) {
            toast.warning("Please enter your feedback.");
            return;
        }
        setIsSubmittingFeedback(true);
        try {
            // --- Call the actual mutation --- 
            await submitFeedback({ 
                orderId: feedbackOrderId, 
                comment: feedbackText,
                rating: feedbackRating 
            }); 
            // --------------------------------
            toast.success("Thank you for your feedback!");
            setFeedbackOrderId(null); // Close dialog implicitly by resetting state
            setFeedbackText("");
            setFeedbackRating(5); // Reset rating to default
            // Optionally refetch feedback data here if needed immediately
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            toast.error(`Failed to submit feedback: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleReorder = async (orderId: Id<"orders">) => {
        // Prevent reordering if currently in a shared cart
        if (activeSharedCartId) {
            toast.error("Cannot reorder items while in a group order. Please leave the group order first.");
            return;
        }
        
        setIsReordering(orderId);
        try {
            const result = await reorderItemsMutation({ orderId });

            if (result.success && result.items.length > 0) {
                // Add available items to the cart one by one
                result.items.forEach((item: ReorderItem) => {
                    // Ensure quantity is handled correctly
                    for (let i = 0; i < item.quantity; i++) {
                         addToCart({
                            _id: item._id,
                            name: item.name,
                            price: item.price,
                        });
                    }
                });
                
                // Display success/partial success message
                if (result.unavailableItems && result.unavailableItems.length > 0) {
                    toast.warning(`Reordered available items. Unavailable: ${result.unavailableItems.join(", ")}. Check your cart!`);
                } else {
                    toast.success("Items from your past order added to cart!");
                }
            } else {
                // Handle case where no items could be reordered
                toast.error(result.message || "Could not reorder items from this order.");
            }
        } catch (error) {
            console.error(`Failed to reorder items from order ${orderId}:`, error);
            toast.error(`Failed to reorder: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsReordering(null);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return <div className="container mx-auto px-4 py-8">Please log in to view your profile.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

            <Tabs defaultValue="orders" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="orders">Order History</TabsTrigger>
                    <TabsTrigger value="settings">Profile Settings</TabsTrigger>
                </TabsList>

                {/* Order History Tab */}
                <TabsContent value="orders">
                    {orders === null || orders.length === 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>No Orders Yet</CardTitle>
                                <CardDescription>Ready to try something delicious?</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/home">
                                    <Button>Start Ordering</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const hasSubmittedFeedback = feedbackSubmittedOrderIds.has(order._id);
                                return (
                                <Card key={order._id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">Order #{order._id.slice(-6)}</CardTitle>
                                                <CardDescription>Placed on: {format(new Date(order._creationTime), 'PPP')}</CardDescription>
                                            </div>
                                            <Badge variant={getStatusBadgeVariant(order.status)} className="ml-auto">{order.status}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-semibold">Total: {formatCurrency(order.totalAmount)}</p>
                                        {/* Can add item previews here later */}
                                    </CardContent>
                                    <CardFooter className="flex flex-wrap gap-2 justify-end">
                                        {/* Reorder Button */}
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleReorder(order._id)}
                                            disabled={isReordering === order._id || !!activeSharedCartId}
                                            title={activeSharedCartId ? "Leave group order to reorder items" : "Reorder items from this order"}
                                        >
                                            {isReordering === order._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                            Reorder
                                        </Button>
                                        
                                        {/* Feedback Button & Dialog (Only for Completed) */}
                                        {order.status.toLowerCase() === 'completed' && (
                                            <Dialog open={feedbackOrderId === order._id} onOpenChange={(isOpen) => !isOpen && setFeedbackOrderId(null)}>
                                                <DialogTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => { setFeedbackOrderId(order._id); setFeedbackText(""); setFeedbackRating(5); }}
                                                        disabled={hasSubmittedFeedback} // Disable if feedback submitted
                                                    >
                                                        <MessageSquare className="mr-2 h-4 w-4" /> 
                                                        {hasSubmittedFeedback ? "Feedback Submitted" : "Add Feedback"}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Feedback for Order #{order._id.slice(-6)}</DialogTitle>
                                                        <DialogDescription>
                                                            Let us know how we did! Your feedback helps us improve.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor="feedback-rating" className="text-right">
                                                                Rating
                                                            </Label>
                                                            <div className="col-span-3 flex items-center">
                                                                <select
                                                                    id="feedback-rating"
                                                                    value={feedbackRating}
                                                                    onChange={(e) => setFeedbackRating(Number(e.target.value))}
                                                                    className="w-full rounded-md border border-input px-3 py-1 text-sm"
                                                                >
                                                                    <option value="5">5 - Excellent</option>
                                                                    <option value="4">4 - Very Good</option>
                                                                    <option value="3">3 - Good</option>
                                                                    <option value="2">2 - Fair</option>
                                                                    <option value="1">1 - Poor</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                            <Label htmlFor={`feedback-${order._id}`} className="text-right">
                                                                Comment
                                                            </Label>
                                                            <Textarea
                                                                id={`feedback-${order._id}`}
                                                                value={feedbackText}
                                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                                className="col-span-3"
                                                                placeholder="Type your feedback here..."
                                                                rows={4}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                            <Button type="button" variant="outline">Cancel</Button>
                                                        </DialogClose>
                                                        <Button 
                                                            type="submit" 
                                                            onClick={handleFeedbackSubmit} 
                                                            disabled={isSubmittingFeedback || !feedbackText.trim()}
                                                        >
                                                            {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Submit Feedback
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}

                                        {/* View Invoice Button (Only for Completed) */}
                                        {order.status.toLowerCase() === 'completed' && (
                                            <Link href={`/invoice/${order._id}`} passHref target="_blank">
                                                <Button variant="outline" size="sm">
                                                     <FileText className="mr-2 h-4 w-4" /> View Invoice
                                                </Button>
                                            </Link>
                                        )}

                                        {/* View Details Button (Always show for now) */}
                                        {/* Consider linking to a specific non-admin details page if needed */}
                                        <Link href={`/orders/${order._id}`} passHref>
                                           <Button variant="default" size="sm">View Details</Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Profile Settings Tab */}
                <TabsContent value="settings">
                    {/* Remove the Card wrapper to allow UserProfile to be responsive */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle>Profile Settings</CardTitle>
                            <CardDescription>Manage your account details, security, and connected accounts.</CardDescription>
                        </CardHeader>
                        <CardContent> */}
                             {/* Using hash routing keeps the user on /profile */}
                            <UserProfile routing="hash" appearance={{ elements: { card: 'shadow-none border-none'} }} />
                        {/* </CardContent>
                    </Card> */}
                </TabsContent>
            </Tabs>
        </div>
    );
} 