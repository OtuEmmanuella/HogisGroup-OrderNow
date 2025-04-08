"use client";

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { Doc } from '@/convex/_generated/dataModel'; // Import Doc type

type Promotion = Doc<"promotions">;

interface PromotionsTableProps {
  promotions: Promotion[];
  onEdit: (promotion: Promotion) => void;
  onDelete: (promoId: Id<"promotions">) => void;
}

// Helper function to format dates (optional, but improves readability)
const formatDate = (timestamp: number | undefined | null): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper function to format discount value
const formatDiscount = (promo: Promotion): string => {
  if (promo.discountType === 'percentage') {
    return `${promo.discountValue}%`;
  }
  if (promo.discountType === 'fixed') {
    // Assuming discountValue is in Kobo
    return `₦${(promo.discountValue / 100).toFixed(2)}`;
  }
  return 'N/A';
};

const PromotionsTable: React.FC<PromotionsTableProps> = ({ promotions, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Valid From</TableHead>
            <TableHead className="hidden lg:table-cell">Valid Until</TableHead>
            <TableHead className="hidden md:table-cell">Usage</TableHead>
            <TableHead className="hidden md:table-cell">Placement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions.map((promo) => (
            <TableRow key={promo._id}>
              <TableCell className="font-medium">{promo.code}</TableCell>
              <TableCell className="hidden md:table-cell truncate max-w-xs">{promo.description || '-'}</TableCell>
              <TableCell>{formatDiscount(promo)}</TableCell>
              <TableCell>
                <Badge variant={promo.isActive ? 'default' : 'secondary'}>
                  {promo.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">{formatDate(promo.startDate)}</TableCell>
              <TableCell className="hidden lg:table-cell">{formatDate(promo.endDate)}</TableCell>
              <TableCell className="hidden md:table-cell">
                 {`${promo.usageCount} / ${promo.usageLimit ?? '∞'}`}
              </TableCell>
              <TableCell className="hidden md:table-cell">{promo.placement || '-'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(promo)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(promo._id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PromotionsTable; 