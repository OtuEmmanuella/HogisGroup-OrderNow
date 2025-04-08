'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  selectedCategoryId: Id<'menuCategories'> | null;
  onSelectCategory: (categoryId: Id<'menuCategories'> | null) => void;
}

export default function CategorySelector({ 
  selectedCategoryId, 
  onSelectCategory 
}: CategorySelectorProps) {
  const categories = useQuery(api.menu.getAllCategories, {});

  // Handle loading state
  if (categories === undefined) {
    return (
      <div className="flex space-x-4 pb-4 px-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-1">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }
  
  // Handle empty state
  if (categories.length === 0) {
    return null; // Don't render anything if no categories
  }

  return (
    <div className="mb-6">
       <h3 className="text-lg font-semibold mb-3 px-1">Categories</h3>
       <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex space-x-4 pb-4 px-1">
          {/* "All" Category Button */}
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "group flex flex-col items-center justify-center space-y-1 flex-shrink-0 focus:outline-none",
              selectedCategoryId === null ? "opacity-100" : "opacity-90 hover:opacity-100"
            )}
          >
            <div className={cn(
              "p-0.5 rounded-full transition-colors duration-200 ease-in-out",
              selectedCategoryId === null ? "bg-[#48594A]" : "bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 group-hover:bg-[#48594A]"
            )}>
              <div className={cn(
                  "h-16 w-16 rounded-full bg-muted flex items-center justify-center"
              )}>
                <span className="text-xs font-medium">All</span>
              </div>
            </div>
            <span className="text-xs font-medium text-center w-20 truncate">All Items</span>
          </button>

          {/* Actual Category Buttons */}
          {categories.map((category) => (
            <button
              key={category._id}
              onClick={() => onSelectCategory(category._id)}
              className={cn(
                "group flex flex-col items-center justify-center space-y-1 flex-shrink-0 focus:outline-none",
                selectedCategoryId === category._id ? "opacity-100" : "opacity-90 hover:opacity-100"
              )}
            >
               <div className={cn(
                "p-0.5 rounded-full transition-colors duration-200 ease-in-out",
                selectedCategoryId === category._id ? "bg-[#48594A]" : "bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 group-hover:bg-[#48594A]"
              )}>
                <div className={cn(
                    "relative h-16 w-16 rounded-full overflow-hidden bg-secondary"
                )}>
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                     <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px] p-1 text-center leading-tight">
                       {category.name}
                     </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-center w-20 truncate">{category.name}</span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
} 