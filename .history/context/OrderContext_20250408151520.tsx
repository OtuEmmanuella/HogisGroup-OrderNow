'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { OrderType } from '@/components/OrderTypeSelector';
import { useShoppingCart, UseShoppingCartReturn, CartItem } from '@/hooks/useShoppingCart';
import Cookies from 'js-cookie';

// Define the shape of the context state
interface OrderContextState extends UseShoppingCartReturn {
  selectedBranchId: Id<'branches'> | null;
  selectedOrderType: OrderType | null;
  setSelectedBranchId: (branchId: Id<'branches'> | null) => void;
  setSelectedOrderType: (orderType: OrderType | null) => void;
  resetOrderFlow: () => void;
  isInitialized: boolean;
}

// Create the context with a default undefined value
const OrderContext = createContext<OrderContextState | undefined>(undefined);

// Create the Provider component
export function OrderProvider({ children }: { children: ReactNode }) {
  // Initialize state from cookies if available (or null if not)
  const [selectedBranchId, _setSelectedBranchId] = useState<Id<'branches'> | null>(null);
  const [selectedOrderType, _setSelectedOrderType] = useState<OrderType | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from cookies on component mount (client-side only)
  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') return;
    
    // Load saved values from cookies
    const storedBranchId = Cookies.get('selectedBranchId');
    const storedOrderType = Cookies.get('selectedOrderType');
    
    if (storedBranchId) {
      _setSelectedBranchId(storedBranchId as Id<'branches'>);
    }
    
    if (storedOrderType) {
      _setSelectedOrderType(storedOrderType as OrderType);
    }
    
    setIsInitialized(true);
  }, []);

  const shoppingCart = useShoppingCart();

  // Wrap state setters to include persistence to cookies
  const setSelectedBranchId = useCallback((branchId: Id<'branches'> | null) => {
    _setSelectedBranchId(branchId);
    
    // Persist to cookies
    if (branchId) {
      Cookies.set('selectedBranchId', branchId, { expires: 7 }); // Expires in 7 days
    } else {
      Cookies.remove('selectedBranchId');
    }
    
    _setSelectedOrderType(null); // Reset order type when branch changes
    // Also remove from cookies when reset
    Cookies.remove('selectedOrderType');
  }, []);

  const setSelectedOrderType = useCallback((orderType: OrderType | null) => {
    _setSelectedOrderType(orderType);
    
    // Persist to cookies
    if (orderType) {
      Cookies.set('selectedOrderType', orderType, { expires: 7 }); // Expires in 7 days
    } else {
      Cookies.remove('selectedOrderType');
    }
  }, []);

  const resetOrderFlow = useCallback(() => {
    _setSelectedBranchId(null);
    _setSelectedOrderType(null);
    
    // Clear cookies when resetting
    Cookies.remove('selectedBranchId');
    Cookies.remove('selectedOrderType');
    
    shoppingCart.clearCart();
  }, [shoppingCart]);

  const contextValue: OrderContextState = {
    selectedBranchId,
    selectedOrderType,
    setSelectedBranchId,
    setSelectedOrderType,
    resetOrderFlow,
    isInitialized,
    ...shoppingCart,
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
}

// Create a custom hook to consume the context
export function useOrderContext() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
} 