import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export function useStorageUrl(storageId: Id<"_storage"> | undefined) {
//   return useQuery(api.storage.getUrl, storageId ? { storageId } : "skip");
// }
