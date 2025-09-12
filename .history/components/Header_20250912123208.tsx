"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import logo from "@/images/logo.webp"
import SearchBar from "./SearchBar";
import { ShoppingBag, MapPin, Menu as MenuIcon, X, Users, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useOrderContext } from "@/context/OrderContext";
import { useUIContext } from "@/context/UIContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { toast } from "sonner"; // Import toast

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
    <div className="relative p-1 text-gray-700 hover:text-[#F96521] transition">
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
  const { totalItems, activeSharedCartId } = useOrderContext(); // Get activeSharedCartId
  const { openCartDrawer } = useUIContext();
  const [copied, setCopied] = useState(false);

  const { user, isSignedIn } = useUser();
  const userSharedCarts = useQuery(
    api.sharedCarts.getUserSharedCarts,
    isSignedIn ? {} : "skip"
  );

  // Find the user's own shared cart (the one they initiated)
  const mySharedCart = userSharedCarts?.find(cart => cart && cart.initiatorId === user?.id);
  const inviteCode = mySharedCart?.inviteCode;

  const handleCopy = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success("Invite code copied!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const changeLocationDisabled = !!activeSharedCartId; // Disable if in a shared cart

  return (
    <header className="sticky top-0 z-50 bg-[#FDF9F1] shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Main Header */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2">
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

          {/* Desktop Navigation & Shared Cart Link */}
          <nav className="hidden md:flex items-center gap-4">
            {/* Invite Code Display */}
            <SignedIn>
              {inviteCode && (
                <div className="flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 px-3 py-1.5">
                  <span className="text-xs font-medium text-orange-800">Your Invite Code:</span>
                  <span className="text-sm font-bold text-orange-900 tracking-wider">{inviteCode}</span>
                  <button onClick={handleCopy} className="p-1 rounded-full hover:bg-orange-200 transition-all duration-200" aria-label="Copy invite code">
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-orange-800" />}
                  </button>
                </div>
              )}
            </SignedIn>

            {/* Show Return to Group Order button if active */}
            {activeSharedCartId && (
                <Link href={`/shared-cart/${activeSharedCartId}`} passHref>
                    <Button variant="outline" size="sm" className="text-[#F96521] border-[#F96521] hover:bg-[#F96521]/10">
                        <Users className="mr-2 h-4 w-4" />
                        Return to Group Order
                    </Button>
                </Link>
            )}
            <Link href="/about" className="text-gray-700 hover:text-[#F96521] font-medium text-sm transition-colors">
              About Us
            </Link>
            {/* Add My Profile link to desktop nav */}
            <Link href="/profile" className="text-gray-700 hover:text-[#F96521] font-medium text-sm transition-colors">
              My Orders
            </Link>
            {/* Conditionally render Change Location link */}
            <Link
              href="/start-ordering"
              className={cn(
                "text-gray-700 hover:text-[#F96521] font-medium text-sm transition-colors flex items-center gap-1",
                changeLocationDisabled && "opacity-50 cursor-not-allowed pointer-events-none" // Style when disabled
              )}
              aria-disabled={changeLocationDisabled}
              onClick={(e) => { if (changeLocationDisabled) e.preventDefault(); }} // Prevent navigation if disabled
            >
              <MapPin size={16} />
              Select Branch
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Cart Button - Desktop */}
            <button
              className={cn("hidden md:block")}
              onClick={openCartDrawer}
              aria-label={`Open cart drawer with ${totalItems} items`}
            >
              <CartButtonContent />
            </button>

            {/* Cart Button - Mobile */}
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
                <UserButton afterSignOutUrl="/home" />
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
                {/* Invite Code for Mobile */}
                <SignedIn>
                  {inviteCode && (
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-orange-100 border border-orange-200 p-2">
                        <div>
                          <span className="text-xs font-medium text-orange-800">Your Invite Code</span>
                          <p className="text-base font-bold text-orange-900 tracking-wider">{inviteCode}</p>
                        </div>
                        <Button onClick={handleCopy} size="sm" variant="ghost" className="h-auto px-2 py-1 text-orange-800 hover:bg-orange-200">
                          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          <span className="ml-2">{copied ? 'Copied!' : 'Copy'}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </SignedIn>
                {/* Mobile Return to Group Order Link */}
                {activeSharedCartId && (
                    <Link
                      href={`/shared-cart/${activeSharedCartId}`}
                      className="flex items-center gap-2 text-[#F96521] font-medium py-2 px-3 rounded-md bg-[#F96521]/10 hover:bg-[#F96521]/20 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Users size={16} />
                      Return to Group Order
                    </Link>
                )}
                <Link
                  href="/about"
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About Us
                </Link>
                {/* Conditionally render Change Location link */}
                <Link
                  href="/start-ordering"
                  className={cn(
                    "flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors",
                    changeLocationDisabled && "opacity-50 cursor-not-allowed pointer-events-none" // Style when disabled
                  )}
                  aria-disabled={changeLocationDisabled}
                  onClick={(e) => {
                    if (changeLocationDisabled) {
                      e.preventDefault();
                      toast.info("Cannot change location while in a group order."); // Optional feedback
                    } else {
                      setIsMenuOpen(false);
                      localStorage.setItem('onboardingStep', 'selectBranch');
                    }
                  }}
                >
                  <MapPin size={16} />
                  Select Branch
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Orders
                </Link>
                <button
                  className="flex items-center gap-2 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-50 text-left transition-colors"
                  onClick={() => { openCartDrawer(); setIsMenuOpen(false); }}
                >
                  <ShoppingBag size={18} />
                  View Cart {isMenuOpen && totalItems > 0 ? `(${totalItems})` : ''}
                </button>
                <SignedIn>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">Account</span>
                    <UserButton afterSignOutUrl="/home" />
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