'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
 
} from "@/components/ui/dialog";
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
import BranchForm, { BranchFormData, Branch } from '@/components/admin/BranchForm';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';

export default function AdminBranchesPage() {
  const { toast } = useToast();
  const branches = useQuery(api.branches.list);
  const createBranch = useMutation(api.branches.createBranch);
  const updateBranch = useMutation(api.branches.updateBranch);
  const deleteBranch = useMutation(api.branches.deleteBranch);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  const handleCreateSubmit = async (data: BranchFormData) => {
    setIsSubmitting(true);
    console.log("Creating branch:", data);
    try {
        // Attempt to parse deliveryZone if provided
        const payload = {
            ...data,
            deliveryZone: data.deliveryZone ? JSON.parse(data.deliveryZone) : undefined
        };
      await createBranch(payload);
      toast({ title: "Success", description: "Branch created successfully." });
      setIsEditDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Failed to create branch:", error);
      toast({ title: "Error", description: `Failed to create branch: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (data: BranchFormData) => {
    if (!currentBranch) return;
    setIsSubmitting(true);
    console.log("Updating branch:", currentBranch._id, data);
     try {
        // Attempt to parse deliveryZone if provided
        const payload = {
            ...data,
            deliveryZone: data.deliveryZone ? JSON.parse(data.deliveryZone) : undefined
        };
      await updateBranch({ branchId: currentBranch._id, ...payload });
      toast({ title: "Success", description: "Branch updated successfully." });
      setIsEditDialogOpen(false); // Close dialog on success
      setCurrentBranch(null);
    } catch (error) {
      console.error("Failed to update branch:", error);
      toast({ title: "Error", description: `Failed to update branch: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (branchId: Id<"branches">) => {
     console.log("Deleting branch:", branchId);
     try {
        await deleteBranch({ branchId });
        toast({ title: "Success", description: "Branch deleted successfully." });
     } catch (error) {
        console.error("Failed to delete branch:", error);
        toast({ title: "Error", description: `Failed to delete branch: ${error instanceof Error ? error.message : "Unknown error"}`, variant: "destructive" });
     }
  };

  const openEditDialog = (branch: Branch) => {
    setCurrentBranch(branch);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setCurrentBranch(null); // Clear current branch for add mode
    setIsEditDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Branches</h1>
        {/* Dialog for Adding/Editing Branch */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{currentBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
              <DialogDescription>
                {currentBranch ? 'Update the details for this branch.' : 'Enter the details for the new branch.'}
              </DialogDescription>
            </DialogHeader>
            <BranchForm
              onSubmit={currentBranch ? handleUpdateSubmit : handleCreateSubmit}
              isLoading={isSubmitting}
              defaultValues={currentBranch ? { 
                  ...currentBranch,
                  // Stringify zone for form
                  deliveryZone: currentBranch.deliveryZone ? JSON.stringify(currentBranch.deliveryZone, null, 2) : '' 
                } : { supportedOrderTypes: [], deliveryZone: '' }} // Provide empty defaults for add
              submitButtonText={currentBranch ? 'Update Branch' : 'Create Branch'}
            />
             {/* Footer might not be needed if BranchForm has its own button */}
             {/* <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
            </DialogFooter> */}
          </DialogContent>
        </Dialog>
      </div>

      {/* Branch Table */}
      <Table>
        <TableCaption>A list of your restaurant branches.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Operating Hours</TableHead>
            <TableHead>Supported Types</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches === undefined && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          )}
          {branches?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No branches found. Add one to get started.
                </TableCell>
             </TableRow>
          )}
          {branches?.map((branch) => (
            <TableRow key={branch._id}>
              <TableCell className="font-medium">{branch.name}</TableCell>
              <TableCell>{branch.address}</TableCell>
              <TableCell>{branch.operatingHours}</TableCell>
              <TableCell>{branch.supportedOrderTypes.join(', ')}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(branch)}>
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the branch
                        and potentially affect related menus and orders.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(branch._id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}