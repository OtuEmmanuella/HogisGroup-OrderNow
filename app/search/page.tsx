"use client";

import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MenuItemCard } from '@/components/MenuDisplay';
import { useOrderContext } from '@/context/OrderContext';
import { Search } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { addToCart } = useOrderContext();

  const searchResults = useQuery(
      api.menu.searchMenuItems, 
      { query: query }
  );

  if (searchResults === undefined) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> 
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Search className="w-6 h-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Results for &quot;{query}&quot;
            </h1>
            <p className="text-gray-600 mt-1">
              Found {searchResults.length} matching items
            </p>
          </div>
        </div>

        {searchResults.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No menu items found
            </h3>
            <p className="text-gray-600 mt-1">
              Try adjusting your search terms or browse the full menu.
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {searchResults.map((item) => (
                 <MenuItemCard 
                    key={item._id}
                    item={{
                        _id: item._id,
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        imageUrl: item.imageUrl,
                        isAvailable: item.isAvailable
                    }}
                    onAddToCart={addToCart}
                    isAddingToCart={false} // Adjust this value as needed
                 />
             ))}
           </div>
        )}
      </div>
    </div>
  );
}
