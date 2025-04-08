'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to track whether a CSS media query matches.
 * @param query - The media query string (e.g., '(min-width: 768px)').
 * @returns `true` if the query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window is defined (for SSR compatibility)
    if (typeof window === 'undefined') {
      // Optional: Return a default value or handle server-side behavior
      // For now, we assume client-side rendering where it matters
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    
    // Handler for query changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set the initial state
    setMatches(mediaQueryList.matches);

    // Add listener using the recommended method
    mediaQueryList.addEventListener('change', listener);

    // Cleanup listener on component unmount
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]); // Only re-run effect if the query string changes

  return matches;
} 