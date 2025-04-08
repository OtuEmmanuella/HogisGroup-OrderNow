"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform, type Variants } from "framer-motion"
import { useRouter } from "next/navigation"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { ChevronLeft, ArrowRight } from "lucide-react"

// Business data for the sections
const businesses = [
  {
    id: "cinema",
    title: "Hogis Cinema",
    description:
      "The best cinema experience in Calabar with state-of-the-art projection, immersive sound systems, and luxurious seating.",
    image: "/images/about/cinema.jpg",
    color: "#E50914",
  },
  {
    id: "restaurants",
    title: "Restaurants",
    description:
      "Experience culinary excellence at our award-winning restaurants, offering a diverse range of cuisines prepared by our expert chefs.",
    image: "/images/about/restaurant.jpg",
    color: "#FFD700",
  },

  {
    id: "club",
    title: "Club Voltage",
    description:
      "The premier nightlife destination in Calabar featuring world-class DJs, premium bottle service, and an electrifying atmosphere.",
    image: "/images/about/club.jpg",
    color: "#8A2BE2",
  },
  {
    id: "fitness",
    title: "Fitness Center",
    description:
      "Our state-of-the-art fitness facilities include modern equipment, professional trainers, and specialized workout programs.",
    image: "/images/about/fitness.jpg",
    color: "#00BFFF",
  },
  {
    id: "hotel",
    title: "Luxury Hotel",
    description:
      "Unparalleled comfort and elegance in our hotel rooms, combining modern amenities with exceptional service.",
    image: "/images/about/hotel.jpg",
    color: "#C5B358",
  },
  {
    id: "spa",
    title: "Spa & Wellness",
    description:
      "Rejuvenate your body and mind at our premium spa, offering a range of treatments delivered by skilled therapists.",
    image: "/images/about/spa.jpg",
    color: "#98FB98",
  },
  {
    id: "lounges",
    title: "Premium Lounges",
    description:
      "Sophisticated spaces designed for relaxation and socialization, with handcrafted cocktails and curated atmospheres.",
    image: "/images/about/lounge.jpg",
    color: "#FF6B6B",
  },
]

// Team members data
const teamMembers = [
  {
    name: "Paul Francis",
    position: "Managing Director",
    image: "/images/about/md.jpg",
  },
  {
    name: "Emmanuella",
    position: "Deputy Managing Director",
    image: "/images/about/dmd.jpg",
  },
]

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
}

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
}

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

// Letter animation for hero text
const letterAnimation: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

// Update the AboutUsClient component
export default function AboutUsClient() {
  const router = useRouter()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  const heroTextRef = useRef<HTMLDivElement>(null)
  const heroImageRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef<HTMLDivElement>(null)

  // Split text helper function for letter animations
  const SplitText = ({ text, className = "" }: { text: string; className?: string }) => {
    return (
      <motion.span
        className={`inline-block ${className}`}
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {text.split("").map((char, i) => (
          <motion.span key={i} className="inline-block" variants={letterAnimation}>
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    )
  }

  return (
    <div className="overflow-hidden bg-black text-white">
      {/* Breadcrumbs with animation */}
      <motion.div
        className="fixed top-4 left-4 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={() => router.back()}
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>

      {/* Hero Section with parallax and letter animation */}
      <section className="hero relative min-h-screen bg-black text-white flex items-center overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, #333 0%, #111 70%, #000 100%)",
            opacity,
          }}
        />

        <motion.div
          className="absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: "url(/images/about/pattern.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            y,
            scale,
          }}
        />

        <div className="container mx-auto px-4 py-24 relative z-10">
          <div ref={heroTextRef} className="max-w-4xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="overflow-hidden">
              <h1 className="text-5xl md:text-7xl lg:text-9xl mb-6 leading-tight font-bold">
                <SplitText text="Hogis Group" />
              </h1>

              <motion.p
                className="text-2xl md:text-3xl leading-relaxed mb-12 max-w-3xl mx-auto font-light tracking-wide"
                variants={fadeInUp}
              >
                The premier hospitality company in Calabar
              </motion.p>

              <motion.div variants={scaleUp} className="inline-block">
                <motion.button
                  className="px-8 py-3 bg-white text-black rounded-full font-medium flex items-center gap-2 group hover:bg-gray-200 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Discover Our Story
                  <motion.span
                    initial={{ x: 0 }}
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Animated scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
            className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2"
          >
            <motion.div className="w-1.5 h-1.5 bg-white rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Welcome Section with staggered paragraph reveals */}
      <motion.section
        className="py-24 bg-gradient-to-b from-black to-zinc-900 text-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1 }}
      >
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-4xl md:text-6xl font-bold mb-16 text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            Welcome to Excellence
          </motion.h2>

          <motion.div
            className="max-w-4xl mx-auto space-y-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.p variants={fadeInUp} className="text-lg md:text-xl leading-relaxed">
              At Hogis Group, we pride ourselves on being the number one hospitality company in Calabar. Our commitment
              to excellence has made us the preferred destination for dining, entertainment, relaxation, and more.
            </motion.p>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl leading-relaxed">
              With a diverse portfolio of businesses including world-class restaurants, the best cinema in town, an
              electrifying nightclub, premium fitness facilities, luxurious hotel accommodations, a rejuvenating spa,
              and sophisticated lounges, we offer unparalleled experiences for every occasion.
            </motion.p>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl leading-relaxed">
              Our success is built on our unwavering dedication to quality, innovation, and customer satisfaction. Each
              venue within the Hogis Group is designed to exceed expectations and create memorable moments for our
              guests.
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      {/* Our Businesses with alternating slide-in animations */}
      <div ref={sectionsRef} className="business-sections">
        {businesses.map((business, index) => (
          <motion.section
            key={business.id}
            className={`business-section py-24 relative overflow-hidden ${index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800"}`}
            style={{ color: "white" }}
          >
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 opacity-10 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 0.1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, ${business.color} 0%, transparent 70%)`,
                mixBlendMode: "overlay",
              }}
            />

            <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <motion.div
                  className={`w-full lg:w-1/2 ${index % 2 !== 0 ? "lg:order-2" : ""}`}
                  variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true }}
                    className="h-0.5 bg-white/20 mb-6 overflow-hidden"
                  >
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: business.color }}
                      initial={{ x: "-100%" }}
                      whileInView={{ x: 0 }}
                      transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      viewport={{ once: true }}
                    />
                  </motion.div>

                  <motion.h3
                    className="text-4xl md:text-6xl font-bold mb-6"
                    style={{ color: business.color }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {business.title}
                  </motion.h3>

                  <motion.p
                    className="text-lg md:text-xl leading-relaxed mb-8"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    {business.description}
                  </motion.p>

                  <motion.button
                    className="px-6 py-2 border border-white/30 rounded-full hover:bg-white hover:text-black transition-colors duration-300 flex items-center gap-2 group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    Explore
                    <motion.span initial={{ x: 0 }} whileHover={{ x: 5 }} className="transition-transform">
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </motion.button>
                </motion.div>

                <motion.div
                  className={`w-full lg:w-1/2 ${index % 2 !== 0 ? "lg:order-1" : ""}`}
                  variants={index % 2 === 0 ? fadeInRight : fadeInLeft}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <motion.div
                    className="relative h-80 md:h-96 w-full overflow-hidden rounded-lg"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />

                    <motion.div
                      initial={{ scale: 1.2 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full w-full"
                    >
                      <Image
                        src={business.image || "/placeholder.svg"}
                        alt={business.title}
                        fill
                        className="object-cover"
                      />
                    </motion.div>

                    <motion.div
                      className="absolute bottom-4 right-4 z-20 flex items-center justify-center w-12 h-12 rounded-full"
                      style={{ backgroundColor: business.color }}
                      initial={{ opacity: 0, scale: 0, rotate: -90 }}
                      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Leadership Team with staggered card reveals */}
      <motion.section
        className="team-section py-24 bg-gradient-to-b from-zinc-900 to-black text-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-3xl md:text-5xl font-bold mb-16 text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Our Leadership
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {teamMembers.map((member, index) => (
              <motion.div key={member.name} className="team-member text-center" variants={scaleUp}>
                <motion.div
                  className="relative h-60 w-60 mx-auto rounded-full overflow-hidden mb-6 border-4 border-white/10"
                  whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    initial={{ scale: 1.2 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full w-full"
                  >
                    <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
                  </motion.div>

                  <motion.div
                    className="absolute inset-0 bg-gradient-radial from-transparent to-black/50"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </motion.div>

                <motion.h3
                  className="text-2xl font-bold mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {member.name}
                </motion.h3>

                <motion.p
                  className="text-lg text-gray-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  {member.position}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Visit Us / Branches Section with 3D card hover effects */}
      <motion.section
        className="py-24 bg-black text-white"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-3xl md:text-5xl font-bold mb-12 text-center"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Visit Our Branches
          </motion.h2>

          <motion.p
            className="text-lg md:text-xl leading-relaxed mb-12 text-center max-w-4xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Experience the Hogis difference at any of our three premium locations in Calabar. Each branch offers our
            signature quality and service in a unique setting.
          </motion.p>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[1, 2, 3].map((branch, index) => (
              <motion.div
                key={branch}
                className="branch-card rounded-lg overflow-hidden bg-zinc-800/50 backdrop-blur-sm"
                variants={scaleUp}
                whileHover={{
                  y: -10,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  transition: { duration: 0.3 },
                }}
                style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
              >
                <motion.div
                  className="relative h-48 w-full overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    initial={{ scale: 1.2 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full w-full"
                  >
                    <Image
                      src={`/images/about/branch${branch}.jpg`}
                      alt={`Hogis Branch ${branch}`}
                      fill
                      className="object-cover"
                    />
                  </motion.div>

                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-black to-transparent"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </motion.div>

                <motion.div
                  className="p-6"
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h3 className="text-xl font-bold mb-2">Branch {branch}</h3>
                  <p className="text-gray-300 mb-4">Calabar, Nigeria</p>
                  <motion.button
                    className="text-sm font-semibold py-2 px-4 border border-white/30 rounded-full hover:bg-white hover:text-black transition-colors duration-300 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Directions
                    <motion.span initial={{ x: 0 }} whileHover={{ x: 3 }} className="transition-transform">
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </motion.button>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Call to Action with floating button animation */}
      <motion.section
        className="py-24 bg-gradient-to-b from-zinc-900 to-black text-white relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background particles */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.3 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{
                y: [0, Math.random() * -30 - 10, 0],
                opacity: [Math.random() * 0.3 + 0.1, Math.random() * 0.7 + 0.3, Math.random() * 0.3 + 0.1],
              }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: Math.random() * 3 + 2,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2
            className="text-3xl md:text-5xl font-bold mb-8"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Experience Hogis Today
          </motion.h2>

          <motion.p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Visit us for an unforgettable experience. Dine, relax, and enjoy the best of what Calabar has to offer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="inline-block"
          >
            <motion.button
              className="text-lg font-semibold py-3 px-8 bg-white text-black rounded-full hover:bg-gray-200 transition-all duration-300"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
              }}
              whileTap={{ scale: 0.98 }}
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              Book Now
              <motion.span
                initial={{ x: 0 }}
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
                className="ml-2 inline-block"
              >
                <ArrowRight className="w-5 h-5 inline" />
              </motion.span>
            </motion.button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}

