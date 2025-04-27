// src/components/AddressForm.tsx
'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const nigerianPhoneRegex = /^(?:0|\+234)[789]\d{9}$/;
const phoneValidationMessage = 'Must be a valid Nigerian number (+234xxxxxxxxxx)';

export const addressSchema = z.object({
  street: z.string().min(5, { message: "Address must be at least 5 characters." }),
  customerPhone: z.string().regex(nigerianPhoneRegex, { message: phoneValidationMessage }),
  isOrderingForSomeoneElse: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  zoneName: z.string().optional(),
  deliveryFee: z.number().optional(),
})
.refine(
  (data) => {
    if (data.isOrderingForSomeoneElse) {
      return !!data.recipientName && data.recipientName.length >= 2 && !!data.recipientPhone;
    }
    return true;
  },
  {
    message:
      'Recipient name (min 2 chars) and phone number are required when ordering for someone else.',
    path: ['recipientName'],
  }
)
.refine(
  (data) => {
    if (data.isOrderingForSomeoneElse && data.recipientPhone) {
      return nigerianPhoneRegex.test(data.recipientPhone);
    }
    return true;
  },
  {
    message: phoneValidationMessage,
    path: ['recipientPhone'],
  }
);

export type AddressFormData = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onSubmit: (data: AddressFormData) => void;
  defaultValues?: Partial<AddressFormData>;
  submitButtonText?: string;
}

export default function AddressForm({
  onSubmit,
  defaultValues,
  submitButtonText = 'Save Address',
}: AddressFormProps) {
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues || {
      street: '',
      customerPhone: '',
      isOrderingForSomeoneElse: false,
      recipientName: '',
      recipientPhone: '',
    },
  });

  const isOrderingForSomeoneElse = form.watch('isOrderingForSomeoneElse');

  function handleFormSubmit(values: AddressFormData) {
    onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+2348012345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isOrderingForSomeoneElse"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Order for someone else?</FormLabel>
                <FormDescription>
                  If this order is a gift or for another person, please provide their details.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {isOrderingForSomeoneElse && (
          <div className="space-y-4 p-4 border rounded-md border-dashed">
            <h4 className="font-medium text-sm text-muted-foreground">Recipient Details</h4>

            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Recipient's full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+2348012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* ← Here’s the important bit: */}
        <Button type="submit" className="mt-2">
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
