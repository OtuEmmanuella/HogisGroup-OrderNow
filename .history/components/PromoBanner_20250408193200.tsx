'use client';

import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Id } from 'mongodb';

interface PromoBannerProps {
  banners: Array<{
    _id: string;
    imageUrl: string;
    code: string;
    description?: string;
  }> | undefined;
  isLoading: boolean;
}

export default function PromoBanner({ banners, isLoading }: PromoBannerProps) {
  if (isLoading) {
    return <Skeleton className="w-full h-[200px] rounded-lg" />;
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 5000,
        }),
      ]}
      className="w-full"
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner._id}>
            <div className="relative w-full h-[200px] rounded-lg overflow-hidden">
              <Image
                src={banner.imageUrl}
                alt={banner.code}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <h3 className="text-2xl font-bold mb-2">{banner.code}</h3>
                  <p className="text-lg">{banner.description || ''}</p>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
} 