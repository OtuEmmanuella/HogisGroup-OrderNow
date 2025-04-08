"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

// Define the Promotion type
type Promotion = Doc<"promotions">;

// Define the Zod schema for form validation
const promotionSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters").max(50).toUpperCase(),
    description: z.string().max(500).optional().nullable(),
    imageUrl: z.string().url({ message: "Please enter a valid image URL" }).optional().or(z.literal('')).nullable(), // Allow empty string or URL
    discountType: z.enum(["percentage", "fixed"], { required_error: "Discount type is required" }),
    discountValue: z.coerce.number().min(0, "Discount value cannot be negative"), // Use coerce for number conversion
    isActive: z.boolean().default(true),
    startDate: z.string().optional().nullable(), // Store as string initially for input
    endDate: z.string().optional().nullable(),   // Store as string initially for input
    usageLimit: z.coerce.number().int().min(0).optional().nullable(),
    minOrderAmount: z.coerce.number().min(0).optional().nullable(), // Store naira value, convert later
    placement: z.enum(["header", "in-menu"]).optional().nullable(),
}).refine(data => {
    // Validate date range if both dates are provided
    if (data.startDate && data.endDate) {
        return new Date(data.startDate).getTime() < new Date(data.endDate).getTime();
    }
    return true;
}, {
    message: "Start date must be before end date",
    path: ["endDate"], // Attach error to endDate field
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
    isOpen: boolean; // Controlled by parent
    onClose: () => void;
    promotion: Promotion | null; // Promotion data for editing, null for creating
}

const PromotionForm: React.FC<PromotionFormProps> = ({ isOpen, onClose, promotion }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createPromotion = useMutation(api.promotions.createPromotion);
    const updatePromotion = useMutation(api.promotions.updatePromotion);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PromotionFormData>({
        resolver: zodResolver(promotionSchema),
        defaultValues: promotion ? {
            ...promotion,
            // Convert dates from timestamp to YYYY-MM-DDTHH:mm string for input
            startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().substring(0, 16) : null,
            endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().substring(0, 16) : null,
            // Convert minOrderAmount from Kobo to Naira for input
            minOrderAmount: promotion.minOrderAmount ? promotion.minOrderAmount / 100 : null,
            imageUrl: promotion.imageUrl ?? null,
        } : {
            code: '',
            description: null,
            imageUrl: null,
            discountType: 'percentage', // Default value
            discountValue: 0,
            isActive: true,
            startDate: null,
            endDate: null,
            usageLimit: null,
            minOrderAmount: null,
            placement: null,
        },
    });

    // Reset form when promotion data changes (e.g., opening edit after create)
    useEffect(() => {
        if (isOpen) {
            reset(promotion ? {
                ...promotion,
                startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().substring(0, 16) : null,
                endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().substring(0, 16) : null,
                minOrderAmount: promotion.minOrderAmount ? promotion.minOrderAmount / 100 : null,
                imageUrl: promotion.imageUrl ?? null,
            } : {
                code: '',
                description: null,
                imageUrl: null,
                discountType: 'percentage', 
                discountValue: 0,
                isActive: true,
                startDate: null,
                endDate: null,
                usageLimit: null,
                minOrderAmount: null,
                placement: null,
            });
        }
    }, [promotion, isOpen, reset]);

    const onSubmit: SubmitHandler<PromotionFormData> = async (data) => {
        setIsSubmitting(true);
        try {
            // Convert dates back to timestamps (or null)
            const startDateTimestamp = data.startDate ? new Date(data.startDate).getTime() : undefined;
            const endDateTimestamp = data.endDate ? new Date(data.endDate).getTime() : undefined;
            // Convert minOrderAmount back to Kobo (or undefined)
            const minOrderAmountKobo = data.minOrderAmount ? Math.round(data.minOrderAmount * 100) : undefined;

            const mutationArgs = {
                ...data,
                code: data.code.toUpperCase(), // Ensure uppercase
                imageUrl: data.imageUrl || undefined, // Send undefined if empty string
                startDate: startDateTimestamp,
                endDate: endDateTimestamp,
                minOrderAmount: minOrderAmountKobo,
                usageLimit: data.usageLimit ?? undefined,
                placement: data.placement ?? undefined,
                // Explicitly handle potential nulls or empty strings if necessary based on schema
                description: data.description || undefined,
            };

            if (promotion) {
                // Update existing promotion
                await updatePromotion({ promoId: promotion._id, ...mutationArgs });
                console.log('Promotion updated successfully');
            } else {
                // Create new promotion
                await createPromotion(mutationArgs);
                console.log('Promotion created successfully');
            }
            onClose(); // Close modal on success
        } catch (error) {
            console.error("Failed to save promotion:", error);
            // TODO: Show user-friendly error message (e.g., using react-toastify or similar)
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to save promotion'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null; // Don't render if not open

    // Form component structure (designed to be inside a modal)
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Form Fields */}
            <div>
                <Label htmlFor="code">Promo Code *</Label>
                <Input id="code" {...register("code")} placeholder="e.g., SUMMER20" />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>

            <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" {...register("imageUrl")} placeholder="https://.../banner.jpg" />
                {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>}
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} placeholder="Details about the promotion..." />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Controller
                        name="discountType"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <SelectTrigger id="discountType">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                     {errors.discountType && <p className="text-red-500 text-xs mt-1">{errors.discountType.message}</p>}
                </div>
                <div>
                    <Label htmlFor="discountValue">Discount Value *</Label>
                    <Input id="discountValue" type="number" step="any" {...register("discountValue")} />
                     {errors.discountValue && <p className="text-red-500 text-xs mt-1">{errors.discountValue.message}</p>}
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="minOrderAmount">Min. Order Amount (₦)</Label>
                    <Input id="minOrderAmount" type="number" step="0.01" {...register("minOrderAmount")} placeholder="Optional" />
                    {errors.minOrderAmount && <p className="text-red-500 text-xs mt-1">{errors.minOrderAmount.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="usageLimit">Usage Limit</Label>
                    <Input id="usageLimit" type="number" step="1" {...register("usageLimit")} placeholder="Optional (e.g., 100)"/>
                    {errors.usageLimit && <p className="text-red-500 text-xs mt-1">{errors.usageLimit.message}</p>}
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <Label htmlFor="startDate">Start Date/Time</Label>
                     <Input id="startDate" type="datetime-local" {...register("startDate")} />
                     {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
                 </div>
                  <div>
                     <Label htmlFor="endDate">End Date/Time</Label>
                     <Input id="endDate" type="datetime-local" {...register("endDate")} />
                     {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                 </div>
             </div>

             <div>
                 <Label htmlFor="placement">Placement (for Banners)</Label>
                 <Controller
                     name="placement"
                     control={control}
                     render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} value={field.value ?? undefined}>
                             <SelectTrigger id="placement">
                                 <SelectValue placeholder="Select placement (optional)" />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="header">Header Banner</SelectItem>
                                 <SelectItem value="in-menu">In-Menu Banner</SelectItem>
                             </SelectContent>
                         </Select>
                     )}
                 />
                 {errors.placement && <p className="text-red-500 text-xs mt-1">{errors.placement.message}</p>}
             </div>

            <div className="flex items-center space-x-2">
                <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                         <Checkbox 
                            id="isActive" 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                        />
                    )}
                />
                <Label htmlFor="isActive">Active</Label>
                {errors.isActive && <p className="text-red-500 text-xs mt-1">{errors.isActive.message}</p>}
            </div>

            {/* Submission Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {promotion ? 'Save Changes' : 'Create Promotion'}
                </Button>
            </div>
        </form>
    );
};

export default PromotionForm; 