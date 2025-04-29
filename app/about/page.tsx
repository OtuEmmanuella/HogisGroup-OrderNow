import AboutUsClient from '@/components/about/AboutUsClient';
import Script from 'next/script';

export const metadata = {
  title: 'About Us | Hogis Group',
  description: 'Learn about Hogis Group, the number one hospitality company in Calabar with restaurants, cinema, club, fitness center, hotel, spa and lounges.',
  alternates: {
    canonical: 'https://ordernow.hogis.com/about'
  }
};

export default function AboutUsPage() {
  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://ordernow.hogisgroup.com"
            }, {
              "@type": "ListItem",
              "position": 2,
              "name": "About Us",
              "item": "https://ordernow.hogisgroup.com/about"
            }]
          })
        }}
      />
      <AboutUsClient />
    </>
  );
}