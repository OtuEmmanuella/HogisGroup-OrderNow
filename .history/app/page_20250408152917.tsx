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
import { useAuth } from '@clerk/nextjs';

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
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
  
  // Effect to check authentication and onboarding status
  useEffect(() => {
    if (!isLoaded) return; // Wait for auth to load

    if (!isSignedIn) {
      // User is not signed in, redirect to sign in
      router.replace('/sign-in');
      return;
    }

    // User is signed in, now check onboarding
    if (!isInitialized) return; // Wait for context to initialize

    if (!selectedBranchId || !selectedOrderType) {
      // Onboarding not complete, redirect
      router.replace('/start-ordering');
      return;
    }
  }, [isLoaded, isSignedIn, isInitialized, selectedBranchId, selectedOrderType, router]);

  // Show loading indicator while auth or context is initializing
  if (!isLoaded || !isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render page content only if both auth and onboarding are complete
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
