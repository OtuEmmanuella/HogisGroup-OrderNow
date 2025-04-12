'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { motion, useScroll, useTransform } from "framer-motion"

interface AboutLayoutProps {
  children: React.ReactNode
}

const AboutLayout = ({ children }: AboutLayoutProps) => {
  return (
    <div className="min-h-screen bg-hotel-dark text-white overflow-hidden bg-[#1A1F2C]">
      {/* Breadcrumbs */}
      <motion.div
        className="fixed top-6 left-6 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Link href="/home" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:transform group-hover:-translate-x-1 transition-transform" />
          <span className="group-hover:text-hotel-gold transition-colors">Back to Home</span>
        </Link>
      </motion.div>

      {/* Main Content */}
      {children}
    </div>
  )
}

export default AboutLayout