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
    // Return empty string or a placeholder like "N/A" if the input is invalid
    return ""; 
  }
  // Divide by 100 to convert kobo/cents to Naira/dollars
  const amountNaira = amountKobo / 100;
  return new Intl.NumberFormat('en-NG', { 
    style: 'currency', 
    currency: 'NGN', 
    // minimumFractionDigits: 2, // Ensure two decimal places
    // maximumFractionDigits: 2 
  }).format(amountNaira);
};

// export function useStorageUrl(storageId: Id<"_storage"> | undefined) {
//   return useQuery(api.storage.getUrl, storageId ? { storageId } : "skip");
// }
