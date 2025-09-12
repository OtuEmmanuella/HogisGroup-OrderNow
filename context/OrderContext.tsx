'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';
import { OrderType } from '@/components/OrderTypeSelector';
import { useShoppingCart, UseShoppingCartReturn, CartItem } from '@/hooks/useShoppingCart';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';

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
      const storedSharedCartId = sessionStorage.getItem('activeSharedCartId'); // Read from sessionStorage

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

      // Validate and set shared cart ID from sessionStorage
      if (storedSharedCartId) {
        _setActiveSharedCartId(storedSharedCartId as Id<'sharedCarts'>);
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
  const { user } = useUser();
  const addSharedItem = useMutation(api.sharedCarts.addSharedCartItem);
  const updateSharedItem = useMutation(api.sharedCarts.updateSharedCartItem);

  // Fetch shared cart data when activeSharedCartId is set
  const sharedCartData = useQuery(
    api.sharedCarts.getSharedCart,
    activeSharedCartId ? { cartId: activeSharedCartId } : 'skip'
  );

  // Synchronize the local cart with the user's items from the shared cart
  useEffect(() => {
    if (activeSharedCartId && sharedCartData && user) {
      const userItems = sharedCartData.items
        .filter(item => item.userId === user.id)
        .map(item => ({
          _id: item.menuItemId,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
        }));
      shoppingCart.setCartItems(userItems);
    } else if (!activeSharedCartId) {
      // Optional: Logic to restore the user's local cart when they leave a shared cart
      // For now, it will just be empty unless you handle re-loading from localStorage
    }
  }, [activeSharedCartId, sharedCartData, user, shoppingCart.setCartItems]);

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
    sessionStorage.removeItem('activeSharedCartId'); // Clear from sessionStorage
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
    // Persist to sessionStorage
    if (cartId) {
      sessionStorage.setItem('activeSharedCartId', cartId);
    } else {
      sessionStorage.removeItem('activeSharedCartId');
    }
  }, []);

  const resetOrderFlow = useCallback(() => {
    _setSelectedBranchId(null);
    _setSelectedOrderType(null);
    _setActiveSharedCartId(null); // Reset active shared cart
    sessionStorage.removeItem('activeSharedCartId'); // Clear from sessionStorage

    // Clear localStorage when resetting
    localStorage.removeItem('selectedBranchId');
    localStorage.removeItem('selectedOrderType');

    shoppingCart.clearCart();
  }, [shoppingCart]);

  // --- Overridden Cart Functions for Shared Cart --- 

  const addToCart = useCallback((item: { _id: Id<"menuItems">; name: string; price: number }) => {
    if (activeSharedCartId) {
      // If in a shared cart, call the mutation
      addSharedItem({
        cartId: activeSharedCartId,
        menuItemId: item._id,
        quantity: 1, // Add one at a time
      }).catch(err => console.error("Failed to add shared item", err));
    } else {
      // Otherwise, use the local cart function
      shoppingCart.addToCart(item);
    }
  }, [activeSharedCartId, addSharedItem, shoppingCart.addToCart]);

  const decrementItem = useCallback((itemId: Id<"menuItems">) => {
    if (activeSharedCartId) {
      // If in a shared cart, call the update mutation with negative quantity
      updateSharedItem({
        cartId: activeSharedCartId,
        menuItemId: itemId,
        quantity: -1,
      }).catch(err => console.error("Failed to decrement shared item", err));
    } else {
      // Otherwise, use the local cart function
      shoppingCart.decrementItem(itemId);
    }
  }, [activeSharedCartId, updateSharedItem, shoppingCart.decrementItem]);

  const removeFromCart = useCallback((itemId: Id<"menuItems">) => {
    if (activeSharedCartId) {
      // Find the item in the local state to get its current quantity
      const itemToRemove = shoppingCart.cartItems.find(item => item._id === itemId);
      if (itemToRemove) {
        // Call mutation to remove all quantities of this item
        updateSharedItem({
          cartId: activeSharedCartId,
          menuItemId: itemId,
          quantity: -itemToRemove.quantity, // Decrement by its full quantity
        }).catch(err => console.error("Failed to remove shared item", err));
      }
    } else {
      // Otherwise, use the local cart function
      shoppingCart.removeFromCart(itemId);
    }
  }, [activeSharedCartId, updateSharedItem, shoppingCart.removeFromCart, shoppingCart.cartItems]);


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
    // Override cart functions with context-aware versions
    addToCart,
    decrementItem,
    removeFromCart,
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