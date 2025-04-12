import React, { useRef, useEffect, useState } from "react";
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronDown, 
  MapPin, 
  Users, 
  Clock, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter,
  Phone,
  Mail,
  Star
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

// Location data for the branches
const locations = [
  {
    id: 1,
    name: "Hogis Marina Resort",
    address: "Marina Waterfront, Calabar",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=2832&auto=format&fit=crop",
    rating: 4.9,
  },
  {
    id: 2,
    name: "Hogis Luxury Suites",
    address: "Diamond Hill, Calabar",
    image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop",
    rating: 4.8,
  },
  {
    id: 3,
    name: "Hogis Grand",
    address: "Central Business District, Calabar",
    image: "https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=2070&auto=format&fit=crop",
    rating: 4.7,
  },
];

// Awards and recognition
const awards = [
  { year: "2023", title: "Best Luxury Hotel in Nigeria" },
  { year: "2022", title: "Excellence in Hospitality Award" },
  { year: "2021", title: "Top 10 African Resorts" },
  { year: "2020", title: "Best Customer Service" },
];

// Main Component
const Index = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const businessesRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  
  const [isVisible, setIsVisible] = useState({
    businesses: false,
    team: false,
    locations: false
  });
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.id === "businesses-section" && entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, businesses: true }));
          }
          if (entry.target.id === "team-section" && entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, team: true }));
          }
          if (entry.target.id === "locations-section" && entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, locations: true }));
          }
        });
      },
      { threshold: 0.2 }
    );
    
    if (businessesRef.current) observer.observe(businessesRef.current);
    if (teamRef.current) observer.observe(teamRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  // Split text helper function for letter animations
  const SplitText = ({ text, className = "" }: { text: string; className?: string }) => {
    return (
      <motion.span
        className={`inline-block ${className}`}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.2,
            },
          },
        }}
      >
        {text.split("").map((char, i) => (
          <motion.span 
            key={i} 
            className="inline-block" 
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    );
  };

  return (
    <div className="min-h-screen bg-hotel-dark text-white overflow-hidden">
      {/* Breadcrumbs */}
      <motion.div
        className="fixed top-6 left-6 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Parallax Background */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2160&auto=format&fit=crop)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity,
            y,
            scale,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-hotel-dark" />
        </motion.div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="mb-8 inline-block">
              <motion.div 
                className="mx-auto h-0.5 w-24 bg-hotel-gold mb-8"
                initial={{ width: 0 }}
                animate={{ width: 96 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <h2 className="text-xl uppercase tracking-widest text-hotel-gold font-light mb-4">Welcome to</h2>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif mb-6 leading-tight">
              <SplitText text="Hogis Group" />
            </h1>

            <motion.p
              className="text-xl md:text-2xl text-white/80 leading-relaxed mb-12 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              The premier hospitality company in Calabar,
              <br />offering unforgettable experiences since 2005.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3 }}
            >
              <motion.button
                className="hotel-button group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Discover Our Story
                <motion.span
                  initial={{ x: 0 }}
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
                >
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </motion.span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <motion.p 
            className="mb-2 text-sm uppercase tracking-widest text-white/70"
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
          >
            Scroll
          </motion.p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6 text-hotel-gold" />
          </motion.div>
        </motion.div>
      </section>

      {/* Welcome Section */}
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
                    <div>
                      <p className="text-5xl font-serif text-hotel-gold">25+</p>
                      <p className="text-sm uppercase tracking-wider mt-1">Years of Excellence</p>
                    </div>
                    <div>
                      <p className="text-5xl font-serif text-hotel-gold">7</p>
                      <p className="text-sm uppercase tracking-wider mt-1">Unique Experiences</p>
                    </div>
                    <div>
                      <p className="text-5xl font-serif text-hotel-gold">3</p>
                      <p className="text-sm uppercase tracking-wider mt-1">Premier Locations</p>
                    </div>
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

      {/* Our Businesses - Bento Grid Section */}
      <section 
        id="businesses-section"
        ref={businessesRef}
        className="hotel-section bg-gradient-to-b from-hotel-dark to-hotel-navy py-20 md:py-32"
      >
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-0.5 w-16 bg-hotel-gold mx-auto mb-6"></div>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">Our Exceptional Experiences</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Discover the diverse range of premium services and experiences offered by the Hogis Group
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[250px]">
            {businesses.map((business, index) => (
              <motion.div
                key={business.id}
                className={`relative rounded-xl overflow-hidden cursor-pointer group ${
                  business.isLarge ? "md:col-span-3 md:row-span-2" : "md:col-span-2"
                }`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={isVisible.businesses ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 w-full h-full">
                  <img 
                    src={business.image} 
                    alt={business.title} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500"></div>
                </div>
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                  <div className="overflow-hidden">
                    <motion.h3 
                      className="text-2xl font-serif mb-2"
                      style={{ color: business.color }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      {business.title}
                    </motion.h3>
                  </div>
                  
                  <p className="text-white/80 text-sm mb-4 line-clamp-2 md:line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
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
                      <span className="text-hotel-gold">Discover</span>
                      <ArrowRight className="w-4 h-4 text-hotel-gold transform group-hover:translate-x-1 transition-transform duration-300" />
                    </motion.div>
                  </div>
                  
                  {/* Accent Line */}
                  <motion.div 
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, ${business.color}, ${business.color}00)`,
                      width: '30%'
                    }}
                    whileHover={{ width: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section 
        id="team-section"
        ref={teamRef}
        className="hotel-section bg-hotel-navy py-20 md:py-32"
      >
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
              Meet the visionaries behind Hogis Group's continuing success and innovation
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div 
                key={member.name}
                className="hotel-card bg-hotel-dark text-white group"
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible.team ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <div className="relative overflow-hidden h-80">
                  <img 
                    src={member.image} 
                    alt={member.name} 
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

      {/* Awards & Recognition */}
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

      {/* Locations Section */}
      <section id="locations-section" className="hotel-section bg-gradient-to-b from-hotel-navy to-hotel-dark py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="h-0.5 w-16 bg-hotel-gold mx-auto mb-6"></div>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">Our Premium Locations</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Experience Hogis luxury at any of our three exceptional properties in Calabar
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {locations.map((location, index) => (
              <motion.div 
                key={location.id}
                className="relative rounded-xl overflow-hidden h-[450px] group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -10 }}
              >
                <img 
                  src={location.image} 
                  alt={location.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20"></div>
                
                <div className="absolute top-4 right-4 bg-hotel-gold/90 text-hotel-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  {location.rating}
                </div>
                
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="space-y-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <h3 className="text-2xl font-serif">{location.name}</h3>
                    
                    <div className="flex items-center gap-2 text-white/70">
                      <MapPin className="w-4 h-4" />
                      <p className="text-sm">{location.address}</p>
                    </div>
                    
                    <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <Button variant="outline" className="border-hotel-gold text-hotel-gold hover:bg-hotel-gold hover:text-hotel-dark">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
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

      {/* Footer */}
      <footer className="bg-hotel-dark py-12 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-serif mb-4">Hogis Group</h3>
              <p className="text-white/70 max-w-md mb-6">
                Setting the standard for luxury hospitality in Calabar since 2005.
                Experience excellence in every detail.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-white/70 hover:text-hotel-gold transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/70 hover:text-hotel-gold transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/70 hover:text-hotel-gold transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/70 hover:text-hotel-gold transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-4">Contact</h4>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-hotel-gold" />
                  <span>+234 703 456 7890</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-hotel-gold" />
                  <span>info@hogisgroup.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-hotel-gold mt-1" />
                  <span>Marina Waterfront, Calabar, Nigeria</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-4">Opening Hours</h4>
              <ul className="space-y-2 text-white/70">
                <li className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span>8:00 AM - 10:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Saturday</span>
                  <span>9:00 AM - 11:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Sunday</span>
                  <span>10:00 AM - 9:00 PM</span>
                </li>
              </ul>
            </div>
          </div>
          
          <Separator className="my-8 bg-white/10" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Hogis Group. All rights reserved.
            </p>
            
            <div className="flex gap-6 text-white/50 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUsClient;
