'use client';

import React, { useState } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import BranchSelector from '@/components/BranchSelector';
import OrderTypeSelector, { OrderType } from '@/components/OrderTypeSelector';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation'; // Use next/navigation
import { Id } from '@/convex/_generated/dataModel';
import Image from 'next/image';
import logo from '@/images/logo.png'; // Assuming you have a logo

type OnboardingStep = 'welcome' | 'selectBranch' | 'selectOrderType';

export default function StartOrderingPage() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const { setSelectedBranchId, setSelectedOrderType } = useOrderContext();
  const router = useRouter();

  const handleBranchSelect = (branchId: Id<'branches'> | null) => {
    if (branchId) {
      setSelectedBranchId(branchId);
      setStep('selectOrderType');
    } else {
      // Optional: Handle deselection if needed, maybe go back?
      setSelectedBranchId(null);
    }
  };

  const handleOrderTypeSelect = async (orderType: OrderType) => {
    try {
      await setSelectedOrderType(orderType);
      router.push('/');
    } catch (error) {
      console.error('Error setting order type:', error);
    }
  };

  const animationProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeInOut' },
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]"> 
      <AnimatePresence mode="wait"> 
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            {...animationProps}
            className="text-center flex flex-col items-center"
          >
            <Image src={logo} alt="Hogis Logo" width={80} height={80} className="mb-6" />
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome to Hogis OrderNow</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                Ready for some delicious food? Let&apos;s get your order started quickly.
            </p>
            <Button size="lg" onClick={() => setStep('selectBranch')} className="bg-[#F96521] hover:bg-[#e05a19]">
              Get Started
            </Button>
          </motion.div>
        )}

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

        {step === 'selectOrderType' && (
          <motion.div
            key="selectOrderType"
            {...animationProps}
            className="w-full max-w-2xl"
          >
            <h2 className="text-2xl font-semibold text-center mb-6">How would you like your order?</h2>
            {/* Pass null initially, we only care about the selection callback here */}
            <OrderTypeSelector selectedType={null} onSelectType={handleOrderTypeSelect} /> 
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 