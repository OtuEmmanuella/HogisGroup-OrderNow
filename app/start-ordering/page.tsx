'use client';

import React, { useState, useEffect } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import BranchSelector from '@/components/BranchSelector';
import OrderTypeSelector, { OrderType } from '@/components/OrderTypeSelector';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import logo from '@/images/logo.webp';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Share2, CreditCard, DollarSign } from 'lucide-react';

type OnboardingStep = 'welcome' | 'selectBranch' | 'selectOrderType' | 'selectOrderTypeForCart';
type PaymentMode = 'split' | 'payAll';
type OrderingMode = 'individual' | 'group';

export default function StartOrderingPage() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedBranch, setSelectedBranch] = useState<Id<'branches'> | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType | null>(null);
  const [orderingMode, setOrderingMode] = useState<OrderingMode>('individual');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('split');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isJoiningCart, setIsJoiningCart] = useState(false);
  const { 
    setSelectedBranchId: setGlobalBranchId, 
    setSelectedOrderType: setGlobalOrderType,
    setActiveSharedCartId 
  } = useOrderContext();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const createSharedCart = useMutation(api.sharedCarts.createSharedCart);
  const joinSharedCart = useMutation(api.sharedCarts.joinSharedCart);
  
  // FIX: Only validate when there's meaningful input (at least 4 characters for a valid code)
  const trimmedInviteCode = inviteCodeInput.trim();
  const shouldValidate = trimmedInviteCode.length >= 4; // Adjust length based on your code format
  const validateInviteCode = useQuery(
    api.sharedCarts.validateInviteCode, 
    shouldValidate ? { inviteCode: trimmedInviteCode } : 'skip'
  );

  // Normalize state on dependency changes
  useEffect(() => {
    setSelectedBranch(null);
    setSelectedOrderType(null);
    setStep('welcome');
    setOrderingMode('individual');
    setSelectedPaymentMode('split');
    setInviteCodeInput('');
  }, [setGlobalBranchId, setGlobalOrderType]);

  // After mount, read onboarding step from localStorage to avoid hydration mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedStep = window.localStorage.getItem('onboardingStep');
    if (storedStep === 'selectBranch') {
      setStep('selectBranch');
    }
    window.localStorage.removeItem('onboardingStep');
  }, []);

  const handleBranchSelect = (branchId: Id<'branches'> | null) => {
    if (branchId) {
      setSelectedBranch(branchId);
      setStep('selectOrderType');
    } else {
      setSelectedBranch(null);
    }
  };

  const handleOrderTypeSelect = async (orderType: OrderType) => {
    if (!selectedBranch) {
      toast.error("Please select a branch first.");
      setStep('selectBranch');
      return;
    }

    // Just set the selected order type, don't proceed yet
    setSelectedOrderType(orderType);
  };

  const handleContinueToOrder = async () => {
    if (!selectedBranch || !selectedOrderType) {
      toast.error("Please select a branch and order type first.");
      return;
    }

    // Handle individual orders
    if (orderingMode === 'individual') {
      try {
        await setGlobalBranchId(selectedBranch);
        await setGlobalOrderType(selectedOrderType);
        router.push('/home');
      } catch (error) {
        console.error('Error setting order type:', error);
        toast.error("Failed to set order type. Please try again.");
      }
      return;
    }

    // Handle group orders
    if (orderingMode === 'group') {
      if (!isSignedIn) {
        // Store the order details and redirect to sign in
        localStorage.setItem('pendingGroupOrder', JSON.stringify({
          branchId: selectedBranch,
          orderType: selectedOrderType,
          paymentMode: selectedPaymentMode
        }));
        toast.info("Please sign in to start a group order.");
        router.push('/sign-in?redirect_url=/auth-callback');
        return;
      }

      await handleCreateCart(selectedOrderType);
    }
  };

  const handleJoinCart = async () => {
    const trimmed = inviteCodeInput.trim();
    
    if (!trimmed || trimmed.length < 4) {
      toast.warning("Please enter a valid invite code.");
      return;
    }

    // If not signed in, store the code and redirect
    if (!isSignedIn) {
      localStorage.setItem('inviteCode', trimmed);
      toast.info("Please sign in to join the group order.");
      router.push('/sign-in?redirect_url=/auth-callback');
      return;
    }

    setIsJoiningCart(true);
    try {
      // Check validation result if we validated
      if (shouldValidate && validateInviteCode === undefined) {
        toast.info("Validating invite code...");
        setIsJoiningCart(false);
        return;
      }

      if (shouldValidate) {
        if (validateInviteCode === null || (validateInviteCode && !validateInviteCode.isValid)) {
          toast.error(validateInviteCode?.message || "Invalid invite code.");
          setIsJoiningCart(false);
          return;
        }
      }

      // User is signed in, proceed to join the cart
      const result = await joinSharedCart({ inviteCode: trimmed });
      setActiveSharedCartId(result.cartId);
      toast.success(result.alreadyMember ? "You are already in this cart." : "Successfully joined the cart!");
      router.push(`/shared-cart/${result.cartId}`);
    } catch (error) {
      console.error("Failed to join shared cart:", error);
      toast.error(`Failed to join cart: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsJoiningCart(false);
    }
  };

  const handleCreateCart = async (orderType: OrderType) => {
    if (!selectedBranch) {
      toast.error("Please select a branch first.");
      setStep('selectBranch');
      return;
    }
    if (!isSignedIn) {
      toast.info("Please sign in to start a group order.");
      return;
    }

    setIsCreatingCart(true);
    try {
      const argsToPass = {
        branchId: selectedBranch!,
        paymentMode: selectedPaymentMode,
        orderType: orderType,
      };

      console.log("Calling createSharedCart with args:", argsToPass);
      const { cartId, inviteCode } = await createSharedCart(argsToPass);
      // Mark this cart as active so header button appears immediately
      setActiveSharedCartId(cartId);
      toast.success(`Group cart created! Invite code: ${inviteCode}`);
      router.push(`/shared-cart/${cartId}`);
    } catch (error) {
      console.error("Failed to create shared cart:", error);
      toast.error(`Failed to create group order: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreatingCart(false);
    }
  };

  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[calc(100vh-150px)] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            {...animationProps}
            className="text-center flex flex-col items-center w-full max-w-lg relative"
          >
            {/* Top right image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -top-20 -right-20 pointer-events-none z-10"
            >
              <Image
                src="/images/coffee ordernow.webp"
                alt="Coffee cup"
                width={150}
                height={150}
                className="object-contain"
              />
            </motion.div>

            {/* Bottom left image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-20 -left-20 pointer-events-none z-10"
            >
              <Image
                src="/ordernow bag.webp"
                alt="Order bag"
                width={150}
                height={150}
                className="object-contain"
              />
            </motion.div>

            <Image src={logo} alt="Hogis Logo" width={120} height={120} className="mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome to Hogis OrderNow</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Order individually or with friends! Split bills, share costs, or treat the group.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 w-full max-w-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4 text-[#F96521]" />
                <span>Personal orders</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-[#F96521]" />
                <span>Group orders</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4 text-[#F96521]" />
                <span>Split bills easily</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4 text-[#F96521]" />
                <span>Pay for friends</span>
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <Button size="lg" onClick={() => setStep('selectBranch')} className="w-full bg-[#F96521] hover:bg-[#e05a19]">
                Start Ordering
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Card className="w-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Join Group Order
                  </CardTitle>
                  <CardDescription>
                    Have an invite code? Join your friends' order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter invite code"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && trimmedInviteCode.length >= 4) {
                          handleJoinCart();
                        }
                      }}
                      className="flex-1"
                      disabled={isJoiningCart}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleJoinCart}
                      disabled={isJoiningCart || trimmedInviteCode.length < 4}
                    >
                      {isJoiningCart ? "Joining..." : "Join"}
                    </Button>
                  </div>
                  {!isSignedIn && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      You'll be prompted to sign in after entering the code
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Select Branch Step */}
        {step === 'selectBranch' && (
          <motion.div
            key="selectBranch"
            {...animationProps}
            className="w-full max-w-lg"
          >
            <h2 className="text-2xl font-semibold text-center mb-6">First, select your branch</h2>
            <BranchSelector onSelectBranch={handleBranchSelect} />
          </motion.div>
        )}

        {/* Select Order Type Step */}
        {step === 'selectOrderType' && (
          <motion.div
            key="selectOrderType"
            {...animationProps}
            className="w-full max-w-4xl space-y-8"
          >
            <div>
              <h2 className="text-2xl font-semibold text-center mb-6">How would you like your order?</h2>
              <div className="w-full max-w-4xl mx-auto">
                <OrderTypeSelector 
                  selectedType={selectedOrderType} 
                  onSelectType={handleOrderTypeSelect} 
                />
              </div>
            </div>

            {/* Always show ordering mode selection */}
            {selectedOrderType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="border-t pt-6 overflow-hidden"
              >
                <h3 className="text-xl font-medium text-center mb-2">Choose your ordering experience</h3>
                <p className="text-center text-muted-foreground mb-6">
                  Order by yourself or create a group order to split bills or pay for everyone
                </p>
                
                <RadioGroup
                  value={orderingMode}
                  onValueChange={(value) => setOrderingMode(value as OrderingMode)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-start"
                >
                  <div className="relative">
                    <RadioGroupItem value="individual" id="individual" className="peer sr-only" />
                    <div 
                      className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${
                        orderingMode === 'individual' 
                          ? 'bg-gradient-to-r from-[#F9A825] to-[#F9A835] opacity-100' 
                          : 'opacity-0'
                      }`}
                    />
                    <div className={`relative ${orderingMode === 'individual' ? 'p-0.5' : ''}`}>
                      <Label htmlFor="individual" className="cursor-pointer">
                        <Card className={`transition-all hover:bg-gray-50 h-auto ${
                          orderingMode === 'individual' 
                            ? 'bg-white border-transparent shadow-md' 
                            : 'border-gray-200'
                        }`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="w-5 h-5" />
                              Order for Myself
                            </CardTitle>
                            <CardDescription>
                              Quick individual order with instant checkout
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Label>
                    </div>
                  </div>

                  <div className="relative">
                    <RadioGroupItem value="group" id="group" className="peer sr-only" />
                    <div 
                      className={`absolute inset-0 rounded-lg transition-opacity duration-200 ${
                        orderingMode === 'group' 
                          ? 'bg-gradient-to-r from-[#F9A825] to-[#F9A835] opacity-100' 
                          : 'opacity-0'
                      }`}
                    />
                    <div className={`relative ${orderingMode === 'group' ? 'p-0.5' : ''}`}>
                      <Label htmlFor="group" className="cursor-pointer">
                        <Card className={`transition-all hover:bg-gray-50 h-auto ${
                          orderingMode === 'group' 
                            ? 'bg-white border-transparent shadow-md' 
                            : 'border-gray-200'
                        }`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              Group Order
                            </CardTitle>
                            <CardDescription>
                              Order with friends • Split bills or pay for everyone • Share invite codes
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {/* Group order details - always visible when group mode is selected */}
                <AnimatePresence>
                  {orderingMode === 'group' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden mb-6"
                    >
                      <Card className="bg-orange-50 border-orange-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Group Payment Options
                          </CardTitle>
                          <CardDescription className="text-orange-700">
                            Perfect for office lunches, family meals, or hanging out with friends!
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <RadioGroup
                            value={selectedPaymentMode}
                            onValueChange={(value) => setSelectedPaymentMode(value as PaymentMode)}
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                              <RadioGroupItem value="split" id="split" className="mt-0.5" />
                              <div className="flex-1">
                                <Label htmlFor="split" className="font-medium cursor-pointer flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  Split Payment
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Everyone pays for their own items • Perfect for office orders
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white">
                              <RadioGroupItem value="payAll" id="payAll" className="mt-0.5" />
                              <div className="flex-1">
                                <Label htmlFor="payAll" className="font-medium cursor-pointer flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  I'll Pay for Everyone
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  You cover the entire group order • Great for treating friends
                                </p>
                              </div>
                            </div>
                          </RadioGroup>

                          {!isSignedIn && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                              <p className="text-sm text-blue-800">
                                💡 <strong>Sign in required:</strong> You'll be prompted to sign in before creating the group order
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Continue button */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleContinueToOrder}
                    disabled={isCreatingCart || !selectedOrderType || !orderingMode}
                    className="bg-[#F96521] hover:bg-[#e05a19] min-w-48 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingCart ? "Creating Group Order..." : 
                     orderingMode === 'group' ? "Create Group Order" : "Continue to Order"}
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}