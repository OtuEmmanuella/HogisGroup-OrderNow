'use client'

import React from 'react'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

const CTASection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
      >
        <img 
          src="https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Experience" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-black/70"></div>
      </motion.div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2 
            className="text-3xl md:text-5xl font-serif mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Experience Luxury Beyond Compare
          </motion.h2>
          
          <motion.p
            className="text-lg text-white/80 mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Indulge in the ultimate hospitality experience at Hogis Group. 
            Book your stay or reserve a table today.
          </motion.p>
          
          <motion.div
            className="space-x-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Button className="bg-hotel-gold hover:bg-amber-600 text-hotel-dark font-medium px-8 py-6">
              Book Now
            </Button>
            <Button variant="outline" className="border-hotel-gold/50 text-white hover:bg-white/10 px-8 py-6">
              Contact Us
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default CTASection