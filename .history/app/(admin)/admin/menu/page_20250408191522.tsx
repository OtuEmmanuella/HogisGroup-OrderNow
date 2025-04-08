'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import MenuItemForm, { MenuItemFormData, MenuItem } from '@/components/admin/MenuItemForm';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMenuPage() {
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Doc<"menuCategories">> & { name: string } | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem> & { categoryId?: Id<'menuCategories'>, imageUrl?: string | null } | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const categories = useQuery(api.menu.getAllCategories, {});

  const createCategory = useMutation(api.menu.createCategory);
  const updateCategory = useMutation(api.menu.updateCategory);
  const deleteCategory = useMutation(api.menu.deleteCategory);
  const createMenuItem = useMutation(api.menu.createMenuItem);
  const updateMenuItem = useMutation(api.menu.updateMenuItem);
  const deleteMenuItem = useMutation(api.menu.deleteMenuItem);

  const handleCategorySubmit = async () => {
    if (!currentCategory?.name) return;
    setCategorySubmitting(true);
    try {
      if (currentCategory._id) {
        await updateCategory({
          categoryId: currentCategory._id,
          name: currentCategory.name,
          description: currentCategory.description || undefined,
        });
        toast({ title: "Success", description: "Category updated." });
      } else {
        await createCategory({
          name: currentCategory.name,
          description: currentCategory.description || undefined,
        });
        toast({ title: "Success", description: "Category created." });
      }
      setIsCategoryDialogOpen(false);
      setCurrentCategory(null);
    } catch (error) {
      console.error("Category save failed:", error);
      toast({ title: "Error", description: `Failed to save category: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleCategoryDelete = async (categoryId: Id<'menuCategories'>) => {
    try {
      await deleteCategory({ categoryId });
      toast({ title: "Success", description: "Category (and its items) deleted." });
    } catch (error) {
      console.error("Category delete failed:", error);
      toast({ title: "Error", description: `Failed to delete category: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    }
  };

  const handleMenuItemSubmit = async (data: MenuItemFormData) => {
    setItemSubmitting(true);
    try {
      const payload = { ...data };
      let successMessage = "";

      if (currentItem?._id) { // Update
        const updatePayload = {
          menuItemId: currentItem._id,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          categoryId: payload.categoryId,
          isAvailable: payload.isAvailable,
          imageUrl: payload.imageUrl
        };
        await updateMenuItem(updatePayload);
        successMessage = "Menu item updated.";
      } else { // Create
        if (!payload.categoryId || payload.name === undefined || payload.price === undefined) {
          throw new Error("Missing required fields (Category, Name, Price) for creating menu item.");
        }
        const createPayload = {
          categoryId: payload.categoryId,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          isAvailable: payload.isAvailable,
          imageUrl: payload.imageUrl
        };
        await createMenuItem(createPayload);
        successMessage = "Menu item created.";
      }

      setIsMenuItemDialogOpen(false); // Close dialog on success
      setCurrentItem(null);
      toast({ title: "Success", description: successMessage });

    } catch (error) {
      console.error("Menu item save failed:", error);
      toast({ title: "Error", description: `Failed to save menu item: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleMenuItemDelete = async (itemId: Id<'menuItems'>) => {
    try {
      await deleteMenuItem({ menuItemId: itemId });
      toast({ title: "Success", description: "Menu item deleted." });
    } catch (error) {
      console.error("Menu item delete failed:", error);
      toast({ title: "Error", description: `Failed to delete menu item: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    }
  };

  const openAddCategoryDialog = () => {
    setCurrentCategory({ name: '' });
    setIsCategoryDialogOpen(true);
  };
  const openEditCategoryDialog = (category: Doc<'menuCategories'>) => {
    setCurrentCategory({ ...category });
    setIsCategoryDialogOpen(true);
  };
  const openAddMenuItemDialog = (categoryId: Id<'menuCategories'>) => {
    setCurrentItem({ categoryId, name: '', price: 0, isAvailable: true, description: '' });
    setIsMenuItemDialogOpen(true);
  };
  const openEditMenuItemDialog = (item: MenuItem) => {
    setCurrentItem({ ...item });
    setIsMenuItemDialogOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Menu Management (Global)</h1>

      <div className="mb-4">
        <Button onClick={openAddCategoryDialog}> <PlusCircle className="mr-2 h-4 w-4" /> Add Category</Button>
      </div>

      {/* Category/Item List */}
      {categories === undefined && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {categories?.length === 0 && <p>No categories created yet.</p>}
      <Accordion type="multiple" className="w-full">
        {categories?.map((category: Doc<"menuCategories">) => (
          <AccordionItem key={category._id} value={category._id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex justify-between items-center w-full pr-4">
                <span>{category.name}</span>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditCategoryDialog(category); }}><Edit className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the category &quot;{category.name}&quot; and ALL menu items within it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={(e) => { e.stopPropagation(); handleCategoryDelete(category._id); }}>
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
              <AdminMenuItemsList
                categoryId={category._id}
                onEditItem={openEditMenuItemDialog}
                onDeleteItem={handleMenuItemDelete}
              />
              <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddMenuItemDialog(category._id)}> <PlusCircle className="mr-2 h-4 w-4" /> Add Item to {category.name}</Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Dialog for Category */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory?._id ? 'Edit' : 'Add'} Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-name" className="text-right">Name</Label>
              <Input id="cat-name" value={currentCategory?.name ?? ''} onChange={(e) => setCurrentCategory(prev => ({ ...prev!, name: e.target.value }))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-desc" className="text-right">Description</Label>
              <Textarea id="cat-desc" value={currentCategory?.description ?? ''} onChange={(e) => setCurrentCategory(prev => ({ ...prev!, description: e.target.value }))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCategorySubmit} disabled={categorySubmitting || !currentCategory?.name}>
              {categorySubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Menu Item */}
      <Dialog open={isMenuItemDialogOpen} onOpenChange={(open) => { if (!open) setCurrentItem(null); setIsMenuItemDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentItem?._id ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
          </DialogHeader>
          {/* Conditionally render form only when dialog is open */}
          {isMenuItemDialogOpen && (
            <MenuItemForm
              onSubmit={handleMenuItemSubmit}
              defaultValues={currentItem ?? undefined}
              isLoading={itemSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// --- AdminMenuItemsList Component ---
interface AdminMenuItemsListProps {
  categoryId: Id<'menuCategories'>;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: Id<'menuItems'>) => void;
}

function AdminMenuItemsList({ categoryId, onEditItem, onDeleteItem }: AdminMenuItemsListProps) {
  const items = useQuery(api.menu.getMenuItems, { categoryId, includeUnavailable: true });

  if (items === undefined) {
    return (
      <div className="space-y-2 p-4 border rounded-md">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 border rounded-md">No items in this category yet.</p>;
  }

  return (
    <div className="border rounded-md divide-y">
      {items.map((item) => (
        <AdminMenuItemRow
          key={item._id}
          item={item as MenuItem} // Assuming MenuItem type aligns with Doc<'menuItems'>
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </div>
  );
}

// --- AdminMenuItemRow Component ---
interface AdminMenuItemRowProps {
  item: MenuItem; // Assuming MenuItem type aligns with Doc<'menuItems'>
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (itemId: Id<'menuItems'>) => void;
}

function AdminMenuItemRow({ item, onEditItem, onDeleteItem }: AdminMenuItemRowProps) {
  // Assuming price is stored in smallest currency unit (e.g., Kobo/Cents)
  const displayPrice = item.price ? (item.price / 100).toFixed(2) : 'N/A';

  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/50">
      <div className="flex items-center space-x-3">
        {item.imageUrl &&
          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-sm object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        }
        {!item.imageUrl && <div className="h-10 w-10 rounded-sm border bg-muted"></div>} {/* Placeholder */}
        <div>
          <span className="font-medium">{item.name}</span>
          {!item.isAvailable && <span className="ml-2 text-xs text-red-500 font-semibold">(Unavailable)</span>}
          {/* Display price with currency symbol - adjust '₦' as needed */}
          <p className="text-sm text-muted-foreground">₦{displayPrice}</p>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm" onClick={() => onEditItem(item)}><Edit className="h-4 w-4" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the menu item "{item.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => onDeleteItem(item._id)}>
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 