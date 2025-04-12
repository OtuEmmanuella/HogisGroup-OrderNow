"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  
  export default function AdminInsightsPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Insights</CardTitle>
          <CardDescription>Insights about your application</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add your content here */}
        </CardContent>
      </Card>
    );
  }