"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Skeleton } from "@/components/ui/skeleton"
import {
Table,
TableBody,
TableCaption,
TableCell,
TableFooter,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table"

export default function AdminInsights() {
const activeUsers = useQuery(api.users.getActiveUsers);
const branchSales = useQuery(api.branches.getBranchSalesAnalytics);

return (
  <Card className="bg-gray-100 dark:bg-darkgray">
    <CardHeader>
      <CardTitle>Admin Insights</CardTitle>
      <CardDescription>Insights about your application</CardDescription>
    </CardHeader>
    <CardContent>
      {activeUsers === undefined ? (
        <Skeleton className="h-4 w-[200px]" />
      ) : (
        <>
          <h2>Active Users</h2>
          <p>Number of active users: {activeUsers.length}</p>
        </>
      )}

      {branchSales === undefined ? (
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[220px]" />
        </div>
      ) : (
        <>
          <h2>Branch Sales Analytics</h2>
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
                  <TableCell>{branch.totalSales.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </CardContent>
  </Card>
);
}