'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useOrderContext } from '@/context/OrderContext';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { PromoBanner } from "./PromoBanner";

const MOBILE_PREVIEW_COUNT = 4;

interface MenuItemCardProps {
  item: {
    _id: Id<"menuItems">;
    name: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    isAvailable?: boolean;
  };
  onAddToCart: (item: { _id: Id<"menuItems">; name: string; price: number }) => void;
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const displayPrice = item.price ? (item.price / 100).toFixed(2) : 'N/A';
  const imageUrl = item.imageUrl;

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col h-full shadow-sm transition-shadow hover:shadow-md",
      !item.isAvailable && "opacity-60"
    )}>
      <div className="relative w-full aspect-[4/3] bg-secondary">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={item.name} 
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            onError={(e) => { 
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = '/images/placeholder-image.svg';
            }}
            priority={false}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <CardHeader className="p-0 mb-1">
          <CardTitle className="text-sm font-semibold line-clamp-1">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-grow mb-2">
          {item.description && (
            <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
          )}
        </CardContent>
        <CardFooter className="p-0 flex flex-col items-start mt-auto">
          <p className="font-bold text-sm mb-2">₦{displayPrice}</p>
          <Button 
            size="sm"
            className="w-full text-xs"
            onClick={() => onAddToCart({_id: item._id, name: item.name, price: item.price})}
            disabled={!item.isAvailable}
          >
            {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

function MenuCategorySection({ categoryId, categoryName, onAddToCart }: {
  categoryId: Id<'menuCategories'>;
  categoryName: string;
  onAddToCart: (item: { _id: Id<"menuItems">; name: string; price: number }) => void;
}) {
  const items = useQuery(api.menu.getMenuItems, { categoryId, includeUnavailable: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const itemsToDisplay = useMemo(() => {
    if (!items) return [];
    if (isMobile && !isExpanded) {
      return items.slice(0, MOBILE_PREVIEW_COUNT);
    }
    return items;
  }, [items, isMobile, isExpanded]);

  const showExpandButton = isMobile && items && items.length > MOBILE_PREVIEW_COUNT;

  if (items === undefined) {
    const skeletonCount = isMobile ? MOBILE_PREVIEW_COUNT : 4;
    const layoutClasses = isMobile ? "flex space-x-3" : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4";
    return (
      <div className={layoutClasses}>
        {[...Array(skeletonCount)].map((_, i) => (
           <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No items currently available in this category.</p>;
  }

  return (
    <div>
      <AnimatePresence initial={false}>
        <motion.div
          key={isExpanded ? "expanded" : "collapsed"}
          initial={{ height: isMobile && !isExpanded ? 'auto' : 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ overflow: 'hidden' }}
        >
          {isMobile && !isExpanded ? (
            <ScrollArea className="w-full whitespace-nowrap rounded-md pb-2">
              <div className="flex space-x-3">
                {itemsToDisplay.map((item) => (
                  <div key={item._id} className="w-40 flex-shrink-0">
                      <MenuItemCard item={item} onAddToCart={onAddToCart} />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {items.map((item) => (
                <MenuItemCard key={item._id} item={item} onAddToCart={onAddToCart} />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {showExpandButton && (
        <div className="mt-3 text-center">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? `Show fewer items in ${categoryName}` : `Show all items in ${categoryName}`}
          >
            {isExpanded ? (
              <><ChevronUp className="mr-1 h-4 w-4" /> Show Less</>
            ) : (
              <><ChevronDown className="mr-1 h-4 w-4" /> Show More</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface MenuDisplayProps {
  selectedCategoryId: Id<'menuCategories'> | null;
}

export default function MenuDisplay({ selectedCategoryId }: MenuDisplayProps) {
  const categories = useQuery(api.menu.getAllCategories);
  const { addToCart } = useOrderContext();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Fetch in-menu banners
  const inMenuBanners = useQuery(api.promotions.getActiveInMenuBanners);
  const isLoadingBanners = inMenuBanners === undefined;

  const handleAddToCart = (item: { _id: Id<"menuItems">; name: string; price: number }) => {
    addToCart({
      _id: item._id,
      name: item.name,
      price: item.price
    });
  };

  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return selectedCategoryId 
      ? categories.filter((c: Doc<"menuCategories">) => c._id === selectedCategoryId)
      : categories;
  }, [categories, selectedCategoryId]);

  const showInMenuBanner = !isLoadingBanners && inMenuBanners && inMenuBanners.length > 0;

  if (categories === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (categories.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No menu categories found.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Display In-Menu Banner using the reusable PromoBanner */}
      {showInMenuBanner && (
        <div className="my-6">
          <PromoBanner banners={inMenuBanners} isLoading={isLoadingBanners} />
        </div>
      )}

      {activeCategories.map((category: Doc<"menuCategories">) => (
        <section key={category._id} aria-labelledby={`category-title-${category._id}`}>
          <h2 id={`category-title-${category._id}`} className="text-xl md:text-2xl font-semibold mb-4">
            {category.name}
          </h2>
          <MenuCategorySection 
            categoryId={category._id}
            categoryName={category.name}
            onAddToCart={handleAddToCart} 
          />
        </section>
      ))}
    </div>
  );
} 