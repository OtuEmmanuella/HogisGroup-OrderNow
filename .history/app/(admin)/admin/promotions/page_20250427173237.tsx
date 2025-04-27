"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, X } from 'lucide-react';
import PromotionsTable from '@/components/admin/PromotionsTable'; // Import the table
import { Id, Doc } from '@/convex/_generated/dataModel';
import PromotionForm from '@/components/admin/PromotionForm'; // Import the form
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Define the Promotion type based on Convex Doc
type Promotion = Doc<"promotions">;

const AdminPromotionsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isSeeding, setIsSeeding] = useState(false); // Add seeding state
  const { toast } = useToast(); // Get toast function

  // Fetch promotions
  const promotions = useQuery(api.promotions.getAllPromotionsAdmin);
  const deletePromotion = useMutation(api.promotions.deletePromotion);
  // Add seeding mutation
  const seedZones = useMutation(api.deliveryZones.seedInitialDeliveryZones);

  const handleCreateNew = () => {
    setEditingPromotion(null); // Ensure we are creating, not editing
    setIsFormOpen(true);
    console.log('Open promotion creation form...');
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setIsFormOpen(true);
    console.log('Open promotion edit form for:', promo.code);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPromotion(null); // Clear editing state on close
  };

  const handleDelete = async (promoId: Id<"promotions">) => {
    // Basic confirmation
    if (!confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) {
      return;
    }
    try {
      await deletePromotion({ promoId });
      toast({ title: "Promotion Deleted", variant: "default" });
    } catch (error) {
      console.error('Failed to delete promotion:', error);
      toast({ title: "Deletion Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  // Seeding Handler
  const handleSeedZones = async () => {
    setIsSeeding(true);
    try {
      const result = await seedZones(); // result type is { zonesAdded: number }
      console.log("Seeding result:", result);
      toast({
        title: "Seeding Successful",
        description: `Successfully seeded ${result?.zonesAdded ?? 0} delivery zones.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to seed delivery zones:", error);
      toast({
        title: "Seeding Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const isLoading = promotions === undefined;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap"> { /* Added flex-wrap and gap */}
        <h1 className="text-3xl font-bold text-gray-900">Manage Promotions</h1>
        <div className="flex gap-2"> { /* Group buttons */}
          {/* Seed Button */}
          <Button onClick={handleSeedZones} disabled={isLoading || isSeeding} variant="secondary">
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSeeding ? 'Seeding Zones...' : 'Seed Delivery Zones'}
          </Button>
          {/* Create Button */}
          <Button onClick={handleCreateNew} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Promotion
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center mt-10">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <p className="ml-2 text-gray-600">Loading promotions...</p>
        </div>
      ) : promotions && promotions.length > 0 ? (
        <PromotionsTable 
          promotions={promotions} 
          onEdit={handleEdit}
          onDelete={handleDelete} 
        />
      ) : (
        <p className="text-center text-gray-500 mt-10">No promotions found. Create one to get started!</p>
      )}

      {/* Modal Implementation */}
      {isFormOpen && (
          <div 
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" 
              aria-hidden="true"
              onClick={handleCloseForm} // Close on backdrop click
          ></div>
      )}
      {isFormOpen && (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 sm:pt-20" 
            aria-labelledby="promotion-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl relative max-h-[85vh] overflow-y-auto">
                {/* Close Button */}
                <Button 
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseForm} 
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
                    aria-label="Close promotion form"
                >
                    <X className="h-5 w-5" />
                </Button>

                <h2 id="promotion-modal-title" className="text-xl font-semibold mb-4">
                    {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
                </h2>
                
                {/* Render the PromotionForm */}
                <PromotionForm 
                    isOpen={isFormOpen} 
                    onClose={handleCloseForm} 
                    promotion={editingPromotion} 
                />
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPromotionsPage; 