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
    isInitialized,
  } = useOrderContext();
  
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'menuCategories'> | null>(null);

  // Fetch active banner promotions
  const bannerPromos = useQuery(api.promotions.getActiveBannerPromos);
  const isLoadingBanners = bannerPromos === undefined;
  
  // Effect to check onboarding status and redirect if necessary
  useEffect(() => {
    // Wait until context is initialized before checking onboarding
    if (!isInitialized) {
      return;
    }

    // If context is initialized, check if onboarding is complete
    if (selectedBranchId === null || selectedOrderType === null) {
      // Onboarding not complete, redirect
      // No need to check localStorage again, rely on initialized context state
      router.replace('/start-ordering');
    }
    // No need for an else block or setIsLoadingContext(false)
    // The component will naturally render content when !isInitialized is false
    // and the redirect condition is not met.

  }, [isInitialized, selectedBranchId, selectedOrderType, router]); // Add isInitialized to dependencies

  // Show loading indicator while context is initializing
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render page content only if onboarding is complete (checked in useEffect)
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
