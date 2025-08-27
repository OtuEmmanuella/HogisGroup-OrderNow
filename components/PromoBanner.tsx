'use client';

import React, { useState, useEffect } from 'react';
import { Doc } from '@/convex/_generated/dataModel';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface PromoBannerProps {
  banners: Doc<"promotions">[] | null | undefined;
  isLoading?: boolean;
  className?: string; 
}

export function PromoBanner({ banners, isLoading = false, className }: PromoBannerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);
  
  // Important: Always call hooks at the top level, before any early returns
  useEffect(() => {
    // Check inside hook if we should set up the interval
    if (!banners || banners.length <= 1) {
      return; // No cleanup needed
    }
    
    const timer = setInterval(() => {
      setActiveBannerIndex(prevIndex => (prevIndex + 1) % banners.length);
    }, 5000);
    
    // Return cleanup function
    return () => clearInterval(timer);
  }, [banners]); // Depend on banners, not banners.length

  // Now handle conditional rendering
  if (isLoading) {
    return (
      <div className={cn(
        "relative w-full overflow-hidden flex items-center justify-center bg-muted rounded-lg",
        isMobile ? "h-24" : "h-45",
        className
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative w-full overflow-hidden border border-border rounded-lg shadow-sm", className)}>
      <div className={cn(
        "flex transition-transform duration-500 ease-in-out",
        isMobile ? "h-24" : "h-48"
      )}
        style={{ transform: `translateX(-${activeBannerIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner._id}
            className={cn(
              "relative flex-shrink-0 w-full h-full transition-opacity duration-300",
              "group cursor-pointer" 
            )}
          >
            <div className={cn(
              "absolute inset-0 bg-cover bg-center transition-opacity duration-300 group-hover:opacity-70 group-focus-within:opacity-70",
            )}
              style={{ 
                backgroundImage: `url(${banner.imageUrl ?? '/placeholder.svg'})`,
                backgroundPosition: '50% 25%' // Position to focus on the top portion of image where most important content typically is
              }}
            />

            <div className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-4 text-center",
              "bg-gradient-to-b from-black/60 via-black/40 to-transparent",
              "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300",
            )}>
              <div className="text-white space-y-1 md:space-y-2">
                {banner.description && <p className="text-xs sm:text-sm md:text-base font-medium line-clamp-2">{banner.description}</p>}
                {banner.code && (
                    <code className="inline-block px-2 py-1 bg-white/20 rounded text-xs sm:text-sm md:text-base font-mono mt-1">
                     USE CODE: {banner.code}
                    </code>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to banner ${index + 1}`}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                activeBannerIndex === index ? "bg-white scale-125" : "bg-white/50 hover:bg-white/75"
              )}
              onClick={() => setActiveBannerIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 