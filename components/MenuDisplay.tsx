'use client';

import React, { useState, useMemo } from 'react'; // Removed useRef, useEffect
import { useQuery, useMutation } from 'convex/react';
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
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// Removed unused useVirtualizer import
import { PromoBanner } from "./PromoBanner";

const MOBILE_PREVIEW_COUNT = 8;

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
  isAddingToCart: boolean; // Add prop to indicate loading state
}

export function MenuItemCard({ item, onAddToCart, isAddingToCart }: MenuItemCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const imageUrl = item.imageUrl;

  const formatPrice = (amountKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountKobo);
  };

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col h-full shadow-sm transition-shadow hover:shadow-md",
      !item.isAvailable && "opacity-60"
    )}>
      <div className="relative w-full aspect-[4/3] bg-secondary overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              imageLoading ? "opacity-0" : "opacity-100"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            onLoadingComplete={() => setImageLoading(false)}
            onError={(e) => {
              setImageLoading(false);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            loading="lazy"
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
          <p className="font-bold text-sm mb-2">{formatPrice(item.price)}</p>
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => onAddToCart({_id: item._id, name: item.name, price: item.price})}
            disabled={!item.isAvailable || isAddingToCart}
          >
            {isAddingToCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {item.isAvailable ? (isAddingToCart ? 'Adding...' : 'Add to Cart') : 'Unavailable'}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

function MenuCategorySection({ categoryId, categoryName, onAddToCart, isAddingToCart }: {
  categoryId: Id<'menuCategories'>;
  categoryName: string;
  onAddToCart: (item: { _id: Id<"menuItems">; name: string; price: number }) => void;
  isAddingToCart: (itemId: Id<"menuItems">) => boolean;
}) {
  const items = useQuery(api.menu.getMenuItems, { categoryId, includeUnavailable: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  // Removed unused isInView state

  // Different preview counts for mobile and desktop
  const DESKTOP_PREVIEW_COUNT = 10;
  const previewCount = isMobile ? MOBILE_PREVIEW_COUNT : DESKTOP_PREVIEW_COUNT;

  const itemsToDisplay = useMemo(() => {
    if (!items) return [];
    if (!isExpanded) {
      return items.slice(0, previewCount);
    }
    return items;
  }, [items, isExpanded, previewCount]);

  const showExpandButton = items && items.length > previewCount;

  // Loading state
  if (items === undefined) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {isMobile ? (
            isExpanded ? (
              // Expanded mobile view: Use a grid layout
              <motion.div
                key="mobile-expanded-grid" // Unique key for AnimatePresence
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="grid grid-cols-2 gap-3 md:gap-4" // Same grid as non-mobile, or adjust as needed
              >
                {itemsToDisplay.map((item) => (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    onAddToCart={onAddToCart}
                    isAddingToCart={isAddingToCart(item._id)}
                  />
                ))}
              </motion.div>
            ) : (
              // Collapsed mobile view: Use horizontal scroll
              <ScrollArea className="w-full whitespace-nowrap rounded-md pb-2">
                <div className="flex space-x-3">
                  {itemsToDisplay.map((item) => (
                    <div key={item._id} className="w-40 flex-shrink-0">
                      <MenuItemCard
                        item={item}
                        onAddToCart={onAddToCart}
                        isAddingToCart={isAddingToCart(item._id)}
                      />
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )
          ) : (
            <motion.div
              initial={false}
              animate={isExpanded ? { height: "auto" } : { height: "auto" }}
              className="relative"
            >
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {itemsToDisplay.map((item) => (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    onAddToCart={onAddToCart}
                    isAddingToCart={isAddingToCart(item._id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {showExpandButton && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? `Show fewer items in ${categoryName}` : `Show all items in ${categoryName}`}
            className="min-w-[120px]"
          >
            {isExpanded ? (
              <><ChevronUp className="mr-1 h-4 w-4" /> Show Less</>
            ) : (
              <><ChevronDown className="mr-1 h-4 w-4" /> Show {items.length - previewCount} More</>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

interface MenuDisplayProps {
  selectedCategoryId: Id<'menuCategories'> | null;
}

export default function MenuDisplay({ selectedCategoryId }: MenuDisplayProps) {
  const categories = useQuery(api.menu.getAllCategories);
  const { addToCart, activeSharedCartId } = useOrderContext(); // Get activeSharedCartId
  const [addingItemId, setAddingItemId] = useState<Id<"menuItems"> | null>(null); // State to track which item is being added

  // Fetch in-menu banners
  const inMenuBanners = useQuery(api.promotions.getActiveInMenuBanners);
  const isLoadingBanners = inMenuBanners === undefined;

  const handleAddToCart = async (item: { _id: Id<"menuItems">; name: string; price: number }) => {
    setAddingItemId(item._id); // Set loading state for this item
    try {
      // Use context addToCart for both personal and shared carts so it upserts correctly
      await Promise.resolve(addToCart({
        _id: item._id,
        name: item.name,
        price: item.price
      }));
      toast.success(`${item.name} added${activeSharedCartId ? ' to group order' : ''}.`);
    } catch (error) {
        console.error("Failed to add item:", error);
        toast.error(`Failed to add ${item.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
        setAddingItemId(null); // Reset loading state
    }
  };

  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return selectedCategoryId
      ? categories.filter((c: Doc<"menuCategories">) => c._id === selectedCategoryId)
      : categories;
  }, [categories, selectedCategoryId]);

  const showInMenuBanner = !isLoadingBanners && inMenuBanners && inMenuBanners.length > 0;

  // Function to check if a specific item is being added
  const isAddingToCart = (itemId: Id<"menuItems">) => addingItemId === itemId;

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
            isAddingToCart={isAddingToCart} // Pass loading check function
          />
        </section>
      ))}
    </div>
  );
}