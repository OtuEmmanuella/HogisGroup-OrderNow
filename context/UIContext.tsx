'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface UIContextState {
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
}

const UIContext = createContext<UIContextState | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const openCartDrawer = useCallback(() => {
    console.log("[UIContext] Opening Cart Drawer");
    setIsCartDrawerOpen(true);
  }, []);
  const closeCartDrawer = useCallback(() => {
     console.log("[UIContext] Closing Cart Drawer");
    setIsCartDrawerOpen(false);
  }, []);
  const toggleCartDrawer = useCallback(() => {
    console.log("[UIContext] Toggling Cart Drawer");
    setIsCartDrawerOpen(prev => !prev);
  }, []);

  // Log state changes
  React.useEffect(() => {
      console.log("[UIContext] isCartDrawerOpen state changed:", isCartDrawerOpen);
  }, [isCartDrawerOpen]);

  const value = {
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    toggleCartDrawer,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIContext() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  return context;
} 