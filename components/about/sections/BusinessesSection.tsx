'use client'

import React from 'react'
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Image from 'next/image'

// Business data for the bento grid
const businesses = [
  {
    id: "cinema",
    title: "Hogis Cinema",
    description:
      "The best cinema experience in Calabar with state-of-the-art projection, immersive sound systems, and luxurious seating.",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=2070&auto=format&fit=crop",
    color: "#E50914",
    isLarge: true,
  },
  {
    id: "restaurants",
    title: "Restaurants",
    description:
      "Experience culinary excellence at our award-winning restaurants, offering a diverse range of cuisines prepared by our expert chefs.",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop",
    color: "#FFD700",
  },
  {
    id: "club",
    title: "Club Voltage",
    description:
      "The premier nightlife destination in Calabar featuring world-class DJs, premium bottle service, and an electrifying atmosphere.",
    image: "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?q=80&w=2070&auto=format&fit=crop",
    color: "#8A2BE2",
  },
  {
    id: "fitness",
    title: "Fitness Center",
    description:
      "Our state-of-the-art fitness facilities include modern equipment, professional trainers, and specialized workout programs.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop",
    color: "#00BFFF",
  },
  {
    id: "hotel",
    title: "Luxury Hotel",
    description:
      "Unparalleled comfort and elegance in our hotel rooms, combining modern amenities with exceptional service.",
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop", 
    color: "#C5B358",
    isLarge: true,
  },
  {
    id: "spa",
    title: "Spa & Wellness",
    description:
      "Rejuvenate your body and mind at our premium spa, offering a range of treatments delivered by skilled therapists.",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop",
    color: "#98FB98",
  },
  {
    id: "lounges",
    title: "Premium Lounges",
    description:
      "Sophisticated spaces designed for relaxation and socialization, with handcrafted cocktails and curated atmospheres.",
    image: "https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?q=80&w=2070&auto=format&fit=crop",
    color: "#FF6B6B",
  },
];

interface BusinessesSectionProps {
  isVisible: boolean;
}

const BusinessesSection = ({ isVisible }: BusinessesSectionProps) => {
  return (
    <section className="hotel-section bg-gradient-to-b from-hotel-dark to-hotel-navy py-20 md:py-32 relative">
      <div className="container mx-auto px-4 max-w-[1400px]">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="h-0.5 w-16 bg-hotel-gold mx-auto mb-6"></div>
          <h2 className="text-3xl md:text-5xl font-serif mb-4 text-shadow-lg">Our Exceptional Experiences</h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto text-shadow">
            Discover the diverse range of premium services and experiences offered by the Hogis Group
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[250px] max-w-[1400px] mx-auto">
          {businesses.map((business, index) => (
            <motion.div
              key={business.id}
              className={`relative rounded-xl overflow-hidden cursor-pointer group ${
                business.isLarge ? "md:col-span-3 md:row-span-2" : "md:col-span-2"
              } backdrop-blur-sm bg-black/20 hover:bg-black/30 transition-all duration-500`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              {/* Background Image with Enhanced Overlay */}
              <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={business.image} 
                  alt={business.title}
                  width={2070}
                  height={1380}
                  className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500 backdrop-blur-[2px] group-hover:backdrop-blur-0"></div>
              </div>
              
              {/* Content with Enhanced Text Effects */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                <div className="overflow-hidden">
                  <motion.h3 
                    className="text-2xl font-serif mb-2 transform text-shadow-lg"
                    style={{ color: business.color }}
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {business.title}
                  </motion.h3>
                </div>
                
                <p className="text-white/90 text-sm mb-4 line-clamp-2 md:line-clamp-3 group-hover:line-clamp-none transition-all duration-500 text-shadow">
                  {business.description}
                </p>
                
                <div className="overflow-hidden">
                  <motion.div 
                    className="flex items-center gap-1 text-sm font-medium"
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                  >
                    <span className="text-hotel-gold text-shadow-lg">Discover</span>
                    <ArrowRight className="w-4 h-4 text-hotel-gold transform group-hover:translate-x-1 transition-transform duration-300" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-hotel-dark/50 to-hotel-navy/80 pointer-events-none"></div>
    </section>
  )
}

export default BusinessesSection