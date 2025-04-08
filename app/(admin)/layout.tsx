'use client';

import React, { ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Simple Admin Sidebar Navigation
function AdminSidebar() {
  // TODO: Add active link styling
  return (
    <aside className="w-64 p-4 border-r h-full top-0">
      <nav className="flex flex-col space-y-2">
        <h2 className="text-lg font-semibold mb-4">Admin Menu</h2>
        <Button variant="ghost" className="justify-start" asChild>
          <Link href="/admin">Dashboard</Link>
        </Button>
        <Button variant="ghost" className="justify-start" asChild>
          <Link href="/admin/branches">Branches</Link>
        </Button>
        <Button variant="ghost" className="justify-start" asChild>
          <Link href="/admin/menu">Menu Management</Link>
        </Button>
        <Button variant="ghost" className="justify-start" asChild>
          <Link href="/admin/orders">Orders</Link>
        </Button>
        <Button variant="ghost" className="justify-start" asChild>
          <Link href="/admin/promotions">Promotions</Link>
        </Button>
        {/* Add more links as needed */}
      </nav>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Fetch Convex user data based on Clerk user ID
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser ? { userId: clerkUser.id } : 'skip'
  );

  const isLoading = isAuthLoading || !isClerkLoaded || (isAuthenticated && clerkUser && convexUser === undefined);
  const isAdmin = isAuthenticated && clerkUser && convexUser?.role === 'admin';

  React.useEffect(() => {
    // If loading is finished and user is not an admin, redirect
    if (!isLoading && !isAdmin) {
      console.warn('Admin access denied. Redirecting...');
      router.replace('/');
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    // Although useEffect redirects, show message briefly or if redirect fails
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-destructive mb-4">Access Denied</p>
        <Link href="/">
          <Button variant="link">Go to Homepage</Button>
        </Link>
      </div>
    );
  }

  // Render admin layout if authorized
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
} 