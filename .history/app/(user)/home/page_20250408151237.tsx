'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import MenuDisplay from '@/components/MenuDisplay';
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
import { PromoBanner } from '@/components/PromoBanner';

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
    if (!isInitialized) {
      return;
    }

    if (selectedBranchId === null || selectedOrderType === null) {
      router.replace('/start-ordering');
    }
  }, [isInitialized, selectedBranchId, selectedOrderType, router]);

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
         <PromoBanner banners={bannerPromos} isLoading={isLoadingBanners} />
      </div>

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