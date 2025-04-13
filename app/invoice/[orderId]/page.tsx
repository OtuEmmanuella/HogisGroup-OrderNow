'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { format } from 'date-fns';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import logo from '@/images/logo.png'; // Assuming you have a logo
import Link from 'next/link'; // Import Link

const VAT_RATE = 0.075; // 7.5% VAT for Nigeria

// Helper to format currency (assuming kobo/cents)
const formatCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined) return '₦--.--';
    return `₦${(amount / 100).toFixed(2)}`;
}

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter(); // Hook for navigation
    const orderId = params.orderId as Id<"orders">;

    const invoiceData = useQuery(api.orders.getInvoiceData, orderId ? { orderId } : 'skip');

    const handlePrint = () => {
        window.print();
    };

    if (invoiceData === undefined) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading Invoice...</p>
            </div>
        );
    }

    if (invoiceData === null) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
                <p className="text-red-600">Invoice not found or you do not have permission to view it.</p>
                <Link href="/profile">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Profile
                    </Button>
                </Link>
            </div>
        );
    }

    const { 
        _id, _creationTime, orderType, totalAmount, discountAmount, subTotal,
        items, branch, user, deliveryAddress, notes 
    } = invoiceData;

    // Use pre-calculated totalAmount and derive VAT from it
    const displayTotal = totalAmount; 
    const displayVAT = (totalAmount / (1 + VAT_RATE)) * VAT_RATE;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white print:p-0">
            <style jsx global>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none; }
                    @page { margin: 0.5in; }
                }
            `}</style>

            {/* Back Button (No Print) */}
            <div className="mb-4 no-print">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-6 print:mb-4">
                <div>
                    <Image src={logo} alt="Hogis Logo" width={100} height={100} className="w-20 h-auto mb-2" />
                    <h1 className="text-2xl font-bold">Invoice</h1>
                    <p className="text-muted-foreground">Order ID: #{_id.slice(-8)}</p>
                    <p className="text-muted-foreground">Date Issued: {format(new Date(), 'PPP')}</p>
                    <p className="text-muted-foreground">Order Date: {format(new Date(_creationTime), 'PPP')}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-semibold mb-1">{branch?.name ?? 'Hogis Branch'}</h2>
                    <p className="text-sm text-muted-foreground">{branch?.address ?? 'Address not available'}</p>
                    <p className="text-sm text-muted-foreground">{branch?.contactNumber ?? 'Contact not available'}</p>
                    <Button onClick={handlePrint} size="sm" className="mt-4 no-print">
                        <Printer className="mr-2 h-4 w-4" /> Print Invoice
                    </Button>
                </div>
            </div>

            <Separator className="my-6 print:my-4" />

            {/* Billing Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:mb-4">
                <div>
                    <h3 className="text-base font-semibold mb-2">Bill To:</h3>
                    <p>{user?.name ?? 'Customer'}</p>
                    <p>{user?.email ?? 'Email not available'}</p>
                    <p className="text-sm text-muted-foreground">{user?.address?.street ?? 'Street Address Not Set'}</p>
                    <p className="text-sm text-muted-foreground">{user?.address?.customerPhone ?? 'Phone Not Set'}</p>
                </div>
                {orderType === 'Delivery' && deliveryAddress && (
                    <div>
                        <h3 className="text-base font-semibold mb-2">Deliver To:</h3>
                        <p>{deliveryAddress.recipientName ?? user?.name ?? 'Customer'}</p>
                        <p>{deliveryAddress.street}</p>
                        <p>Phone: {deliveryAddress.recipientPhone ?? deliveryAddress.customerPhone}</p>
                    </div>
                )}
                 {orderType !== 'Delivery' && (
                    <div>
                        <h3 className="text-base font-semibold mb-2">Order Type:</h3>
                        <p>{orderType}</p>
                    </div>
                 )}
            </div>

            {/* Items Table */}
            <h3 className="text-base font-semibold mb-2">Order Summary:</h3>
            <Table className="mb-6 print:mb-4">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60%]">Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item._id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Totals Section */}
            <div className="flex justify-end mb-6 print:mb-4">
                <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {discountAmount !== null && discountAmount !== undefined && discountAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="text-green-600">-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    {/* Added VAT Row */}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({VAT_RATE * 100}%):</span>
                        <span>{formatCurrency(displayVAT)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total Amount:</span>
                        <span>{formatCurrency(displayTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {notes && (
                <div className="mt-6 print:mt-4 pt-4 border-t">
                     <h3 className="text-base font-semibold mb-2">Notes:</h3>
                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 text-center text-xs text-muted-foreground border-t no-print">
                Thank you for your order!
            </div>
        </div>
    );
}