'use client'

import React, { useRef, useEffect, useState } from "react"
import AboutLayout from "./AboutLayout"
import {
  HeroSection,
  WelcomeSection,
  BusinessesSection,
  TeamSection,
  AwardsSection,
  LocationsSection,
  CTASection,
  Footer
} from "./sections"

const AboutUsClient = () => {
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

  return (
    <AboutLayout>
      <HeroSection />
      <WelcomeSection />
      <div id="businesses-section" ref={businessesRef}>
        <BusinessesSection isVisible={isVisible.businesses} />
      </div>
      <div id="team-section" ref={teamRef}>
        <TeamSection isVisible={isVisible.team} />
      </div>
      <AwardsSection />
      <div id="locations-section">
        <LocationsSection isVisible={isVisible.locations} />
      </div>
      <CTASection />
      <Footer />
    </AboutLayout>
  );
};

export default AboutUsClient;
