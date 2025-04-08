'use client'

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2 } from 'lucide-react';
import { Label as UILabel } from "@/components/ui/label";

// Zod schema for form validation
const menuItemFormSchema = z.object({
  categoryId: z.custom<Id<"menuCategories">>(val => typeof val === 'string' && val.length > 0, { message: "Category is required." }),
  name: z.string().min(3, { message: "Item name must be at least 3 characters." }),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => {
        if (typeof val === 'string' || typeof val === 'number') {
            const num = parseFloat(String(val));
            return isNaN(num) ? undefined : Math.round(num * 100);
        }
        return undefined;
    },
    z.number().positive({ message: "Price must be a positive number (in cents/kobo)." })
  ),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

// Simplified FormData type directly from schema inference
export type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

// Type for the full menu item data including Convex fields
// Note: price here is the stored number (Kobo/Cents)
export type MenuItem = {
  _id: Id<"menuItems">;
  _creationTime: number;
  categoryId: Id<"menuCategories">;
  name: string;
  description?: string | null;
  price: number; // Stored price in cents/kobo
  imageUrl?: string | null;
  isAvailable: boolean;
};

interface MenuItemFormProps {
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  isLoading: boolean;
  defaultValues?: Partial<MenuItem>;
  submitButtonText?: string;
}

export default function MenuItemForm({ 
    onSubmit,
    isLoading,
    defaultValues,
    submitButtonText = "Save Item",
 }: MenuItemFormProps) {

  const categories = useQuery(api.menu.getAllCategories, {});

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: defaultValues ? {
        name: defaultValues.name ?? '',
        description: defaultValues.description ?? '',
        price: defaultValues.price !== undefined ? (defaultValues.price / 100) : undefined,
        isAvailable: defaultValues.isAvailable ?? true,
        imageUrl: defaultValues.imageUrl ?? '',
        categoryId: defaultValues.categoryId,
    } : {
      name: '',
      description: '',
      price: undefined,
      isAvailable: true,
      imageUrl: '',
      categoryId: undefined,
    },
  });

  const handleFormSubmit: SubmitHandler<MenuItemFormData> = async (values) => {
    console.log("Menu item form submitting values (price should be in cents):", values);
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories === undefined && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                  {categories?.map((category: Doc<"menuCategories">) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                   {categories?.length === 0 && <SelectItem value="no-categories" disabled>No categories available.</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Jollof Rice" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the item" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (₦)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="1500.00" 
                  {...field} 
                  value={field.value ?? ''} 
                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                 />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                    type="url" 
                    placeholder="https://your-cdn.com/image.jpg" 
                    {...field} 
                    value={field.value ?? ''}
                 />
              </FormControl>
              <FormDescription>
                Enter the full URL of the image (e.g., from Cloudinary).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="isAvailableCheckbox"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <UILabel htmlFor="isAvailableCheckbox">
                  Available for Ordering?
                </UILabel>
                <FormDescription>
                  Uncheck this if the item should not be available for customers to order.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Saving..." : submitButtonText}
        </Button>
      </form>
    </Form>
  );
} 