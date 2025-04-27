"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

export default function AdminInsights() {
  const activeUsers = useQuery(api.users.getActiveUsers);
  const branchSales = useQuery(api.branches.getBranchSalesAnalytics);
  const seedZones = useMutation(api.deliveryZones.seedInitialDeliveryZones);
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedZones = async () => {
    setIsSeeding(true);
    try {
      const result = await seedZones();
      console.log("Seeding result:", result);
      toast({ 
        title: "Seeding Successful", 
        description: `Successfully seeded ${result?.seededCount ?? 0} delivery zones.`,
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

  return (
    <div className="space-y-6">
      <Card className="bg-gray-100 dark:bg-darkgray">
        <CardHeader>
          <CardTitle>Admin Insights</CardTitle>
          <CardDescription>Insights about your application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Active Users</h2>
            {activeUsers === undefined ? (
              <Skeleton className="h-4 w-[200px]" />
            ) : (
              <p>Number of active users: {activeUsers.length}</p>
            )}
          </div>

          {branchSales === undefined ? (
            <div>
              <h2 className="text-xl font-semibold mb-2">Branch Sales Analytics</h2>
              <div className="flex flex-col space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[220px]" />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-2">Branch Sales Analytics</h2>
              <Table>
                <TableCaption>A list of branch sales.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Branch Name</TableHead>
                    <TableHead>Total Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchSales.map((branch) => (
                    <TableRow key={branch.branchId}>
                      <TableCell className="font-medium">{branch.branchName}</TableCell>
                      <TableCell>₦{branch.totalSales.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-100 dark:bg-darkgray">
        <CardHeader>
          <CardTitle>Database Seeding</CardTitle>
          <CardDescription>Perform initial data seeding actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <p>Seed initial delivery zones into the database:</p>
            <Button onClick={handleSeedZones} disabled={isSeeding}>
              {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSeeding ? 'Seeding...' : 'Seed Delivery Zones'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Note: This will add predefined delivery zones if they don't already exist. Running it multiple times is usually safe.</p>
        </CardContent>
      </Card>
    </div>
  );
}