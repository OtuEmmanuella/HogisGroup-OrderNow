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
import logo from '@/images/logo.png';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type OnboardingStep = 'welcome' | 'selectBranch' | 'selectOrderType' | 'selectOrderTypeForCart';
type PaymentMode = 'split' | 'payAll';

export default function StartOrderingPage() {
  const [step, setStep] = useState<OnboardingStep>(() => {
    if (typeof localStorage !== 'undefined') {
      const storedStep = localStorage.getItem('onboardingStep');
      localStorage.removeItem('onboardingStep');
      return (storedStep === 'selectBranch' ? 'selectBranch' : 'welcome');
    }
    return 'welcome';
  });
  const [selectedBranch, setSelectedBranch] = useState<Id<'branches'> | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('split');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isJoiningCart, setIsJoiningCart] = useState(false);
  const { setSelectedBranchId: setGlobalBranchId, setSelectedOrderType: setGlobalOrderType } = useOrderContext();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const createSharedCart = useMutation(api.sharedCarts.createSharedCart);
  const joinSharedCart = useMutation(api.sharedCarts.joinSharedCart);

  useEffect(() => {
    setSelectedBranch(null);
    setStep('welcome');
    setSelectedPaymentMode('split');
    setInviteCodeInput('');
  }, [setGlobalBranchId, setGlobalOrderType]);

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
    try {
      await setGlobalBranchId(selectedBranch);
      await setGlobalOrderType(orderType);
      router.push('/home');
    } catch (error) {
      console.error('Error setting order type:', error);
      toast.error("Failed to set order type. Please try again.");
    }
  };

  const handleStartGroupOrder = async () => {
    if (!selectedBranch) {
      toast.error("Please select a branch first.");
      setStep('selectBranch');
      return;
    }
    if (!isSignedIn) {
      toast.info("Please sign in to start a group order.");
      return;
    }

    setStep('selectOrderTypeForCart');
  };

  const handleJoinCart = async () => {
    if (!inviteCodeInput.trim()) {
      toast.warning("Please enter an invite code.");
      return;
    }
    if (!isSignedIn) {
      localStorage.setItem('inviteCode', inviteCodeInput.trim());
      window.location.href = `/sign-in?redirect_url=/auth-callback`;
      return;
    }

    setIsJoiningCart(true);
    try {
      const result = await joinSharedCart({ inviteCode: inviteCodeInput.trim() });
      toast.success(result.alreadyMember ? "You are already in this cart." : "Successfully joined the cart!");
      router.push(`/shared-cart/${result.cartId}`);
    } catch (error) {
      console.error("Failed to join shared cart:", error);
      toast.error(`Failed to join cart: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsJoiningCart(false);
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

            <Image src={logo} alt="Hogis Logo" width={80} height={80} className="mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome to Hogis OrderNow</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
              Ready for some delicious food? Let&apos;s get your order started quickly.
            </p>
            <Button size="lg" onClick={() => setStep('selectBranch')} className="mb-8 bg-[#F96521] hover:bg-[#e05a19]">
              Get Started
            </Button>

            <div className="w-full border-t pt-6 mt-6">
              <h3 className="text-lg font-medium mb-3">Have an Invite Code?</h3>
              <div className="flex gap-2 justify-center">
                <Input
                  type="text"
                  placeholder="Enter invite code"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="max-w-xs"
                  disabled={isJoiningCart}
                />
                <Button
                  variant="secondary"
                  onClick={handleJoinCart}
                  disabled={isJoiningCart || !inviteCodeInput.trim()}
                >
                  {isJoiningCart ? "Joining..." : "Join Cart"}
                </Button>
              </div>
              {!isSignedIn && <p className="text-sm text-muted-foreground mt-2">Sign in to join a cart.</p>}
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
            <div className="w-full border-t pt-6 mt-8 text-center">
              <h3 className="text-lg font-medium mb-3">Have an Invite Code?</h3>
              <div className="flex gap-2 justify-center">
                <Input
                  type="text"
                  placeholder="Enter invite code"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="max-w-xs"
                  disabled={isJoiningCart}
                />
                <Button
                  variant="secondary"
                  onClick={handleJoinCart}
                  disabled={isJoiningCart || !inviteCodeInput.trim()}
                >
                  {isJoiningCart ? "Joining..." : "Join Cart"}
                </Button>
              </div>
              {!isSignedIn && <p className="text-sm text-muted-foreground mt-2">Sign in to join a cart.</p>}
            </div>
          </motion.div>
        )}

        {/* Select Order Type Step */}
        {step === 'selectOrderType' && (
          <motion.div
            key="selectOrderType"
            {...animationProps}
            className="w-full max-w-2xl"
          >
            <h2 className="text-2xl font-semibold text-center mb-6">How would you like your order?</h2>
            <OrderTypeSelector selectedType={null} onSelectType={handleOrderTypeSelect} />

            <div className="mt-8 text-center border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Ordering with Friends?</h3>
              {isSignedIn ? (
                <>
                  <RadioGroup
                    defaultValue="split"
                    value={selectedPaymentMode}
                    onValueChange={(value) => setSelectedPaymentMode(value as PaymentMode)}
                    className="flex justify-center gap-6 mb-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="split" id="split" />
                      <Label htmlFor="split">Split Payment (Everyone pays their share)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="payAll" id="payAll" />
                      <Label htmlFor="payAll">Initiator Pays All</Label>
                    </div>
                  </RadioGroup>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleStartGroupOrder}
                    disabled={isCreatingCart}
                    className="mb-6"
                  >
                    {isCreatingCart ? "Starting..." : "Start Group Order"}
                  </Button>

                  <div className="w-full border-t pt-6">
                    <h3 className="text-lg font-medium mb-3">Or Join with Invite Code?</h3>
                    <div className="flex gap-2 justify-center">
                      <Input
                        type="text"
                        placeholder="Enter invite code"
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value)}
                        className="max-w-xs"
                        disabled={isJoiningCart}
                      />
                      <Button
                        variant="secondary"
                        onClick={handleJoinCart}
                        disabled={isJoiningCart || !inviteCodeInput.trim()}
                      >
                        {isJoiningCart ? "Joining..." : "Join Cart"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">Sign in to start or join a group order.</p>
                  <Button variant="outline" size="lg" onClick={() => router.push('/sign-in')}>
                    Sign in
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Select Order Type for Cart Step */}
        {step === 'selectOrderTypeForCart' && (
          <motion.div
            key="selectOrderTypeForCart"
            {...animationProps}
            className="w-full max-w-2xl"
          >
            <h2 className="text-2xl font-semibold text-center mb-6">
              How would you like your order for the group cart?
            </h2>
            <OrderTypeSelector
              selectedType={null}
              isCreatingCart={isCreatingCart}
              onSelectType={async (orderType: OrderType) => {
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
                  const { cartId, inviteCode } = await createSharedCart({
                    branchId: selectedBranch,
                    paymentMode: selectedPaymentMode,
                    orderType: orderType,
                  });

                  toast.success(`Group order created! Invite code: ${inviteCode}`);
                  router.push(`/shared-cart/${cartId}`);
                } catch (error) {
                  console.error("Failed to create shared cart:", error);
                  toast.error(`Failed to create group order: ${error instanceof Error ? error.message : "Unknown error"}`);
                } finally {
                  setIsCreatingCart(false);
                  setStep('welcome');
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}