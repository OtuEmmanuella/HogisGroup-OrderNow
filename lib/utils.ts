import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number (representing kobo/cents) into a Nigerian Naira currency string.
 * Example: 12345 -> ₦123.45
 * @param amountKobo The amount in kobo/cents.
 * @returns Formatted currency string (e.g., "₦123.45") or empty string if input is invalid.
 */
export const formatCurrency = (amountKobo: number | null | undefined): string => {
  if (amountKobo === null || amountKobo === undefined || isNaN(amountKobo)) {
    return ""; 
  }
  const amountNaira = Math.round(amountKobo / 100);
  return new Intl.NumberFormat('en-NG', { 
    style: 'currency', 
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountNaira);
};
