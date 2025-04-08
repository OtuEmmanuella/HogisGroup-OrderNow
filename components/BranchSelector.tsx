'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BranchSelectorProps {
  onSelectBranch: (branchId: Id<'branches'> | null) => void;
}

export default function BranchSelector({ onSelectBranch }: BranchSelectorProps) {
  const branches = useQuery(api.branches.list);
  const [open, setOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<Id<'branches'> | null>(null);

  const selectedBranch = branches?.find((branch) => branch._id === selectedBranchId);

  const handleSelect = (currentValue: string) => {
    const branchId = currentValue as Id<'branches'>;
    const newSelectedId = selectedBranchId === branchId ? null : branchId;
    setSelectedBranchId(newSelectedId);
    onSelectBranch(newSelectedId);
    setOpen(false); // Close popover on selection
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={branches === undefined} // Disable while loading
        >
          {branches === undefined ? (
            <Skeleton className="h-5 w-3/4" />
          ) : selectedBranch ? (
             <>
               <span className="truncate">{selectedBranch.name}</span>
               <span className="text-xs text-muted-foreground ml-2 truncate hidden sm:inline">
                 ({selectedBranch.address})
               </span>
             </>
           ) : (
             "Select a Hogis Branch..."
           )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent
            asChild
            forceMount
            className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <Command>
                <CommandInput placeholder="Search branch..." />
                <CommandList>
                  <CommandEmpty>
                    {branches === undefined ? "Loading branches..." : "No branch found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {branches?.map((branch) => (
                      <CommandItem
                        key={branch._id}
                        value={branch._id} // Use ID as value for selection
                        onSelect={handleSelect}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedBranchId === branch._id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{branch.name}</span>
                          <span className="text-xs text-muted-foreground">{branch.address}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
} 