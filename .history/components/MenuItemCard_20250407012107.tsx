'use client';

import React, { useState, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Define the props interface
export interface MenuItemCardProps {
  item: any; // Consider defining a stricter type based on your menuItem schema
  onAddToCart: (item: any) => void;
  imageStorageId?: Id<"_storage"> | null;
}

// Define the component function
function MenuItemCard({ item, onAddToCart, imageStorageId }: MenuItemCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const maybeImageUrl = useQuery(
    api.files.getUrl, // Assuming you have this API endpoint
    imageStorageId ? { storageId: imageStorageId } : "skip"
  );

  useEffect(() => {
    if (maybeImageUrl === null) {
        setImageUrl(null);
        setIsImageLoading(false);
        setImageError(false); // Explicitly false if no image ID
    } else if (maybeImageUrl) {
        setImageUrl(maybeImageUrl);
        // No need to set loading false here, Image `onLoad` will handle it
        setImageError(false);
    } else if (maybeImageUrl === undefined && imageStorageId) {
        // Still loading from Convex
        setIsImageLoading(true);
        setImageError(false);
    }
     // If maybeImageUrl is explicit null and no storageId, it means no image
     if (maybeImageUrl === null && !imageStorageId) {
        setIsImageLoading(false);
        setImageError(false);
    }
  }, [maybeImageUrl, imageStorageId]);

  const handleImageLoad = () => {
    setIsImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.warn(`Failed to load image for item: ${item.name} (Storage ID: ${imageStorageId})`);
    setIsImageLoading(false);
    setImageError(true);
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="p-0 relative">
        <div className="aspect-square w-full overflow-hidden">
          {isImageLoading && (
            <Skeleton className="h-full w-full" />
          )}
          {!imageStorageId && !isImageLoading && (
              <div className="h-full w-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <span>No Image</span>
              </div>
          )}
          {imageUrl && !imageError && (
            <Image
              src={imageUrl}
              alt={item.name}
              layout="fill"
              objectFit="cover"
              className={`transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized // Add this if you encounter issues with external URLs/storage providers
            />
          )}
          {imageError && !isImageLoading && (
            <div className="h-full w-full bg-secondary flex flex-col items-center justify-center text-destructive">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <span>Load Error</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-1 truncate">{item.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description || 'No description available.'}</CardDescription>
        <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {/* Ensure item.isAvailable exists on your item object */}
        <Button className="w-full" onClick={() => onAddToCart(item)} disabled={!item.isAvailable}>
           {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Export the component as default
export default MenuItemCard;
