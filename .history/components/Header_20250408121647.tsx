"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import logo from "@/images/logo.png";
import SearchBar from "./SearchBar";
import { ShoppingBag, MapPin, Menu as MenuIcon, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useOrderContext } from "@/context/OrderContext";
import { useUIContext } from "@/context/UIContext"; // Import UIContext
import { cn } from "@/lib/utils"; // Import cn
import { motion, AnimatePresence } from "framer-motion"; // Import framer-motion

// Moved outside Header to avoid re-declaration on every render
// Helper component for cart icon content, handles client-side hydration
const CartButtonContent = () => {
  const { totalItems } = useOrderContext();
  const [isClient, setIsClient] = useState(false);

  // Only render the count badge on the client after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="relative p-2 text-gray-700 hover:text-[#F96521] transition">
      <ShoppingBag size={20} />
      {/* Only render badge if isClient and totalItems > 0 */}
      {isClient && totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#F96521] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
          {totalItems}
        </span>
      )}
    </div>
  );
};

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { totalItems } = useOrderContext();
  const { openCartDrawer } = useUIContext(); // Get open function

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Main Header */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logo}
              alt="Hogis"
              width={100}
              height={100}
              className="w-10 h-10 md:w-12 md:h-12"
              priority
            />
            <span className="font-bold text-xl hidden md:block text-[#141414]">Hogis</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-gray-700 hover:text-[#F96521] font-medium text-sm transition-colors">
              About Us
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Cart Button - Desktop (Button to open drawer) */}
            <button
              className={cn("hidden md:block")}
              onClick={openCartDrawer}
              aria-label={`Open cart drawer with ${totalItems} items`}
            >
              <CartButtonContent />
            </button>
            
            {/* Cart Button - Mobile (Button to open drawer) */}
            <button
              className={cn("md:hidden")}
              onClick={openCartDrawer}
              aria-label={`Open cart drawer with ${totalItems} items`}
            >
              <CartButtonContent />
            </button>

            {/* User Account */}
            <div className="hidden md:block">
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-[#F96521] hover:text-[#e05a19] transition">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>

            {/* Mobile Menu Toggle - Animated */}
            <button
              className="md:hidden p-1.5 text-gray-700 rounded-md hover:bg-gray-100 relative h-10 w-10 flex items-center justify-center"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <div className="relative w-6 h-6">
                {/* Animated from burger to X */}
                <motion.div
                  animate={isMenuOpen ? { opacity: 0, y: 0, rotate: 45 } : { opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <MenuIcon size={22} />
                </motion.div>
                <motion.div
                  animate={isMenuOpen ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 0, rotate: -45 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <X size={22} />
                </motion.div>
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 pt-0">
          <SearchBar />
        </div>

        {/* Mobile Menu - With improved animation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut",
                opacity: { duration: 0.2 }
              }}
              className="md:hidden px-4 py-0 border-t bg-white overflow-hidden"
            >
              <motion.div 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1, staggerChildren: 0.1 }}
                className="flex flex-col space-y-3 py-3"
              >
                <Link
                  href="/about"
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About Us
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Orders
                </Link>
                {/* Optional: Trigger cart from dropdown too */}
                <button
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 text-left transition-colors"
                  onClick={() => { openCartDrawer(); setIsMenuOpen(false); }}
                >
                  <ShoppingBag size={18} />
                  {/* Display count text conditionally after hydration */}
                  View Cart {isMenuOpen && totalItems > 0 ? `(${totalItems})` : ''}
                </button>
                <SignedIn>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">Account</span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                <SignedOut>
                  <div className="pt-2 border-t">
                    <SignInButton mode="modal">
                      <button className="w-full py-2 px-3 bg-[#F96521] text-white text-sm rounded-md hover:bg-[#e05a19] transition">
                        Sign In
                      </button>
                    </SignInButton>
                  </div>
                </SignedOut>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default Header;