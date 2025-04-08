'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import MenuDisplay from '@/components/MenuDisplay';
// import ShoppingCartDisplay from '@/components/ShoppingCartDisplay'; // Ensure this is removed or commented out
import CategorySelector from '@/components/CategorySelector';
import { useOrderContext } from '@/context/OrderContext';
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PromoBanner } from '@/components/PromoBanner'; // Import the reusable banner

export default function HomePage() {
  const {
    selectedBranchId,
    selectedOrderType,
  } = useOrderContext();
  
  const router = useRouter();
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'menuCategories'> | null>(null);

  // Fetch active banner promotions
  const bannerPromos = useQuery(api.promotions.getActiveBannerPromos);
  const isLoadingBanners = bannerPromos === undefined;
  
  // Effect to check onboarding status and redirect if necessary
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Don't redirect if context values are not yet determined
    if (selectedBranchId === undefined || selectedOrderType === undefined) {
      // Still loading context, wait...
      return;
    }
    
    // Check for stored values in localStorage to prevent unnecessary redirects
    const storedBranchId = localStorage.getItem('selectedBranchId');
    const storedOrderType = localStorage.getItem('selectedOrderType');
    
    // Only redirect if both context AND localStorage don't have the values
    if ((selectedBranchId === null && !storedBranchId) || 
        (selectedOrderType === null && !storedOrderType)) {
      // Onboarding not complete, redirect
      router.replace('/start-ordering');
    } else {
      // Onboarding complete, allow rendering
      setIsLoadingContext(false);
    }
  }, [selectedBranchId, selectedOrderType, router]);

  // Show loading indicator while checking context/redirecting
  if (isLoadingContext) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render page content only if onboarding is complete
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Use the reusable PromoBanner component */}
      <div className="mb-8">
         <PromoBanner banners={bannerPromos} isLoading={isLoadingBanners} />
      </div>

      {/* Render Category Selector */}
      <CategorySelector 
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      <div className="space-y-6">
        <MenuDisplay selectedCategoryId={selectedCategoryId} />
      </div>
    </div>
  );
}
