'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import MenuDisplay from '@/components/MenuDisplay';
import CategorySelector from '@/components/CategorySelector';
import { useOrderContext } from '@/context/OrderContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PromoBanner from '@/components/PromoBanner';

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
    if (!selectedBranchId || !selectedOrderType) {
      // Onboarding not complete, redirect
      router.replace('/start-ordering');
      return;
    }

    // Optional: You could add additional validation here
    // For example, checking if the selected branch still exists
    // or if the order type is still valid for that branch

  }, [isInitialized, selectedBranchId, selectedOrderType, router]);

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
    <div className="max-w-7xl mx-auto px-4 py-8">
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
