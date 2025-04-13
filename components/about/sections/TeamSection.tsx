'use client'

import React from 'react'
import { motion } from "framer-motion"
import { Linkedin, Twitter } from 'lucide-react'
import Image from 'next/image'

// Team members data
const teamMembers = [
  {
    name: "Paul Francis",
    position: "Managing Director",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop",
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Emmanuella",
    position: "Deputy Managing Director",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=2076&auto=format&fit=crop", 
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Alexander Morgan",
    position: "Operations Director",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=2787&auto=format&fit=crop",
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Sophia Chen",
    position: "Head of Marketing",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=2061&auto=format&fit=crop",
    linkedin: "#",
    twitter: "#",
  },
];

interface TeamSectionProps {
  isVisible: boolean;
}

const TeamSection = ({ isVisible }: TeamSectionProps) => {
  return (
    <section className="hotel-section bg-gradient-to-b from-hotel-dark to-hotel-navy py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="h-0.5 w-16 bg-hotel-gold mx-auto mb-6"></div>
          <h2 className="text-3xl md:text-5xl font-serif mb-4">Leadership Excellence</h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Meet the visionaries behind Hogis Group&apos;s continuing success and innovation
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div 
              key={member.name}
              className="hotel-card bg-hotel-dark text-white group"
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="relative overflow-hidden h-80">
                <Image 
                  src={member.image} 
                  alt={member.name}
                  width={2070}
                  height={1380}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                  <div className="p-6 w-full">
                    <div className="flex justify-center gap-4">
                      <motion.a 
                        whileHover={{ y: -5, color: "#C5B358" }}
                        className="bg-white/10 p-2 rounded-full backdrop-blur-sm"
                        href={member.linkedin}
                      >
                        <Linkedin className="w-5 h-5" />
                      </motion.a>
                      <motion.a 
                        whileHover={{ y: -5, color: "#C5B358" }}
                        className="bg-white/10 p-2 rounded-full backdrop-blur-sm"
                        href={member.twitter}
                      >
                        <Twitter className="w-5 h-5" />
                      </motion.a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-medium">{member.name}</h3>
                <p className="text-white/70 text-sm">{member.position}</p>
                
                <div className="mt-4 h-0.5 w-12 bg-hotel-gold/50 group-hover:w-full transition-all duration-500"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TeamSection