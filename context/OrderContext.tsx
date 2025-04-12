'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { OrderType } from '@/components/OrderTypeSelector';
import { useShoppingCart, UseShoppingCartReturn, CartItem } from '@/hooks/useShoppingCart';

// Define the shape of the context state
interface OrderContextState extends UseShoppingCartReturn {
  selectedBranchId: Id<'branches'> | null;
  selectedOrderType: OrderType | null;
  activeSharedCartId: Id<'sharedCarts'> | null; // Add state for active shared cart
  setSelectedBranchId: (branchId: Id<'branches'> | null) => void;
  setSelectedOrderType: (orderType: OrderType | null) => void;
  setActiveSharedCartId: (cartId: Id<'sharedCarts'> | null) => void; // Add setter
  resetOrderFlow: () => void;
  isInitialized: boolean;
}

// Create the context with a default undefined value
const OrderContext = createContext<OrderContextState | undefined>(undefined);

// Create the Provider component
export function OrderProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available (or null if not)
  const [selectedBranchId, _setSelectedBranchId] = useState<Id<'branches'> | null>(null);
  const [selectedOrderType, _setSelectedOrderType] = useState<OrderType | null>(null);
  const [activeSharedCartId, _setActiveSharedCartId] = useState<Id<'sharedCarts'> | null>(null); // Initialize shared cart state
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage on component mount (client-side only)
  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Load saved values from localStorage
      const storedBranchId = localStorage.getItem('selectedBranchId');
      const storedOrderType = localStorage.getItem('selectedOrderType');
      // Note: We don't persist activeSharedCartId to localStorage as it's session-specific

      // Validate and set branch ID
      if (storedBranchId && typeof storedBranchId === 'string') {
        _setSelectedBranchId(storedBranchId as Id<'branches'>);
      } else {
        localStorage.removeItem('selectedBranchId');
      }

      // Validate and set order type
      if (storedOrderType && ['Delivery', 'Dine-In', 'Take-out'].includes(storedOrderType)) {
        _setSelectedOrderType(storedOrderType as OrderType);
      } else {
        localStorage.removeItem('selectedOrderType');
      }
    } catch (error) {
      // If there's any error in reading/parsing localStorage, clear it
      localStorage.removeItem('selectedBranchId');
      localStorage.removeItem('selectedOrderType');
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const shoppingCart = useShoppingCart();

  // Wrap state setters to include persistence to localStorage
  const setSelectedBranchId = useCallback((branchId: Id<'branches'> | null) => {
    _setSelectedBranchId(branchId);

    // Persist to localStorage
    if (branchId) {
      localStorage.setItem('selectedBranchId', branchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }

    _setSelectedOrderType(null); // Reset order type when branch changes
    localStorage.removeItem('selectedOrderType');
    _setActiveSharedCartId(null); // Also reset active shared cart when branch changes
  }, []);

  const setSelectedOrderType = useCallback((orderType: OrderType | null) => {
    _setSelectedOrderType(orderType);

    // Persist to localStorage
    if (orderType) {
      localStorage.setItem('selectedOrderType', orderType);
    } else {
      localStorage.removeItem('selectedOrderType');
    }
    // Don't reset shared cart ID when only order type changes
  }, []);

  // Setter for active shared cart ID
  const setActiveSharedCartId = useCallback((cartId: Id<'sharedCarts'> | null) => {
    _setActiveSharedCartId(cartId);
    // Clear regular cart when entering/leaving a shared cart context? Optional.
    // if (cartId) {
    //   shoppingCart.clearCart();
    // }
  }, []);

  const resetOrderFlow = useCallback(() => {
    _setSelectedBranchId(null);
    _setSelectedOrderType(null);
    _setActiveSharedCartId(null); // Reset active shared cart

    // Clear localStorage when resetting
    localStorage.removeItem('selectedBranchId');
    localStorage.removeItem('selectedOrderType');

    shoppingCart.clearCart();
  }, [shoppingCart]);

  const contextValue: OrderContextState = {
    selectedBranchId,
    selectedOrderType,
    activeSharedCartId, // Provide shared cart ID
    setSelectedBranchId,
    setSelectedOrderType,
    setActiveSharedCartId, // Provide setter
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