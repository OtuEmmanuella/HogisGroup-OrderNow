'use client'; // Need this for the hook

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

export default function Page() {
  const searchParams = useSearchParams();
  // Get the intended redirect URL from the query parameter
  const redirectUrlParam = searchParams.get('redirect_url');

  // Use the redirect_url from params if available, otherwise default to fallback
  // Fallback to '/home' if the param is missing for some reason
  const effectiveRedirectUrl = redirectUrlParam || "/home"; 

  console.log("[SignIn Page] Redirect URL Param:", redirectUrlParam);
  console.log("[SignIn Page] Effective Redirect URL for component:", effectiveRedirectUrl);

  return (
      <div className="flex items-start justify-center min-h-screen pt-20 md:pt-40">
      <SignIn 
        // Use forceRedirectUrl for higher priority
        forceRedirectUrl={effectiveRedirectUrl}
        // Keep fallback as an ultimate backup 
        fallbackRedirectUrl="/home" 
       />
    </div>
  );
} 