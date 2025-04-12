'use client'

import React from 'react'
import { motion } from "framer-motion"
import { Star } from 'lucide-react'

// Awards and recognition data
const awards = [
  { year: "2023", title: "Best Luxury Hotel in Nigeria" },
  { year: "2022", title: "Excellence in Hospitality Award" },
  { year: "2021", title: "Top 10 African Resorts" },
  { year: "2020", title: "Best Customer Service" },
];

const AwardsSection = () => {
  return (
    <section className="hotel-section bg-hotel-dark py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            className="w-full lg:w-1/2"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-0.5 w-16 bg-hotel-gold mb-6"></div>
            <h2 className="text-3xl md:text-4xl font-serif mb-6">Awards & Recognition</h2>
            <p className="text-lg text-white/80 mb-8">
              Our commitment to excellence has been recognized with numerous prestigious awards in the hospitality industry.
            </p>
            
            <div className="space-y-6">
              {awards.map((award, index) => (
                <motion.div 
                  key={index}
                  className="flex gap-4 items-start"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex-shrink-0">
                    <Star className="w-6 h-6 text-hotel-gold" />
                  </div>
                  <div>
                    <p className="font-medium">{award.title}</p>
                    <p className="text-sm text-white/60">{award.year}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div 
            className="w-full lg:w-1/2 relative overflow-hidden rounded-xl"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <img 
              src="https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?q=80&w=2071&auto=format&fit=crop" 
              alt="Award Celebration" 
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-hotel-dark to-transparent opacity-70"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <p className="text-xl font-serif italic">
                "Hogis Group sets the standard for luxury hospitality in Nigeria."
              </p>
              <p className="text-sm mt-2 text-white/70">— Hospitality Excellence Awards, 2023</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default AwardsSection