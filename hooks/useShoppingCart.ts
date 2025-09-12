import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import { Id } from '@/convex/_generated/dataModel';

export interface CartItem {
  _id: Id<'menuItems'>;
  name: string;
  price: number;
  quantity: number;
}

export interface UseShoppingCartReturn {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void; // Add this setter
  addToCart: (item: { _id: Id<'menuItems'>; name: string; price: number }) => void;
  removeFromCart: (itemId: Id<'menuItems'>) => void;
  decrementItem: (itemId: Id<'menuItems'>) => void;
  clearCart: () => void;
  cartTotal: number;
  totalItems: number;
}

const CART_STORAGE_KEY = 'hogis_cart';

export function useShoppingCart(): UseShoppingCartReturn {
  const { user } = useUser();
  
  // Initialize state from localStorage or default to empty array
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') {
        return []; // Cannot access localStorage on server
    }
    try {
        const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
        return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
        console.error("Error reading cart from localStorage:", error);
        return [];
    }
  });

  // Effect to update localStorage whenever cartItems change
  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } catch (error) {
            console.error("Error saving cart to localStorage:", error);
        }
    }
  }, [cartItems]);

  const addToCart = useCallback(
    (itemToAdd: { _id: Id<'menuItems'>; name: string; price: number }) => {
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => item._id === itemToAdd._id);
        if (existingItem) {
          // Increment quantity
          return prevItems.map((item) =>
            item._id === itemToAdd._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          // Add new item
          return [...prevItems, { ...itemToAdd, quantity: 1 }];
        }
      });
    },
    []
  );

  const decrementItem = useCallback((itemId: Id<'menuItems'>) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item._id === itemId);
      if (existingItem?.quantity === 1) {
        // Remove item if quantity is 1
        return prevItems.filter((item) => item._id !== itemId);
      } else {
        // Decrement quantity
        return prevItems.map((item) =>
          item._id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) } // Prevent negative quantity
            : item
        );
      }
    });
  }, []);

  // Function to completely remove an item regardless of quantity
  const removeFromCart = useCallback((itemId: Id<'menuItems'>) => {
    setCartItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalItems = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  return {
    cartItems,
    setCartItems, // Expose the new setter
    addToCart,
    removeFromCart,
    decrementItem,
    clearCart,
    cartTotal,
    totalItems,
  };
}