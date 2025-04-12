'use client'

import React from 'react'
import { motion } from "framer-motion"

const stats = [
  { value: "25+", label: "Years of Excellence" },
  { value: "7", label: "Unique Experiences" },
  { value: "3", label: "Premier Locations" },
]

const WelcomeSection = () => {
  return (
    <section className="hotel-section bg-hotel-dark py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            className="w-full md:w-1/2"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-0.5 w-16 bg-hotel-gold mb-6"></div>
            <h2 className="text-3xl md:text-5xl font-serif mb-8">A Legacy of Luxury & Excellence</h2>
            
            <div className="space-y-6 text-white/80">
              <p className="text-lg">
                At Hogis Group, we pride ourselves on being the number one hospitality company in Calabar. 
                Our commitment to excellence has made us the preferred destination for dining, entertainment, 
                relaxation, and more.
              </p>
              
              <p className="text-lg">
                With a diverse portfolio of businesses including world-class restaurants, the best cinema in town, 
                an electrifying nightclub, premium fitness facilities, luxurious hotel accommodations, 
                a rejuvenating spa, and sophisticated lounges, we offer unparalleled experiences for every occasion.
              </p>
              
              <div className="pt-4">
                <div className="flex gap-8">
                  {stats.map((stat, index) => (
                    <div key={index}>
                      <p className="text-5xl font-serif text-hotel-gold">{stat.value}</p>
                      <p className="text-sm uppercase tracking-wider mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full md:w-1/2 relative"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative z-10 rounded-lg overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
              <img 
                src="https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2825&auto=format&fit=crop" 
                alt="Hogis Luxury Experience" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 border border-hotel-gold/30 rounded-lg z-0"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 border border-hotel-gold/30 rounded-lg z-0"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default WelcomeSection