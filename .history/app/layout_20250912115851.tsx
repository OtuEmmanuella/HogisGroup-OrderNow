import Script from 'next/script';
import localFont from "next/font/local";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { OrderProvider } from "@/context/OrderContext";
import { UIProvider } from "@/context/UIContext";
import LayoutClientWrapper from '@/components/LayoutClientWrapper';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Hogis OrderNow - Online Food Ordering & Delivery",
  description: "Order delicious food from Hogis branches in Calabar. Easy online ordering, fast delivery, and multiple restaurant options from the premier hospitality group.",
  keywords: "Hogis, food delivery, Calabar restaurants, online ordering, food pickup, Nigerian cuisine",
  openGraph: {
    title: "Hogis OrderNow - Online Food Ordering & Delivery",
    description: "Order delicious food from Hogis branches in Calabar. Easy online ordering, fast delivery, and multiple restaurant options.",
    type: "website",
    locale: "en_NG",
    url: "https://ordernow.hogisgroup.com",
    siteName: "Hogis OrderNow",
    images: [{
      url: "https://res.cloudinary.com/diaknp7in/image/upload/v1744036785/ChatGPT_Image_Apr_7_2025_02_02_25_PM_zcmnux.png",
      width: 1200,
      height: 630,
      alt: "Hogis OrderNow - Online Food Ordering Platform"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Hogis OrderNow - Online Food Ordering & Delivery",
    description: "Order delicious food from Hogis branches in Calabar. Easy online ordering, fast delivery, and multiple restaurant options.",
    images: ["https://res.cloudinary.com/diaknp7in/image/upload/v1744036785/ChatGPT_Image_Apr_7_2025_02_02_25_PM_zcmnux.png"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Hogis Group",
                "url": "https://ordernow.hogisgroup.com",
                "logo": "https://ordernow.hogisgroup.com/images/logo.webp",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+234-703-456-7890",
                  "contactType": "customer service"
                },
                "sameAs": [
                  "https://facebook.com/hogisgroup",
                  "https://instagram.com/hogisgroup",
                  "https://twitter.com/hogisgroup",
                  "https://linkedin.com/company/hogisgroup"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "Restaurant",
                "name": "Hogis Marina Resort",
                "image": "https://ordernow.hogisgroup.com/images/logo.webp",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Marina Waterfront",
                  "addressLocality": "Calabar",
                  "addressRegion": "Cross River",
                  "addressCountry": "NG"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "4.9757",
                  "longitude": "8.3417"
                },
                "url": "https://ordernow.hogisgroup.com",
                "telephone": "+234-703-456-7890",
                "servesCuisine": ["Nigerian", "International"],
                "priceRange": "₦₦-₦₦₦",
                "openingHoursSpecification": [
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "opens": "08:00",
                    "closes": "22:00"
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "Saturday",
                    "opens": "09:00",
                    "closes": "23:00"
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "Sunday",
                    "opens": "10:00",
                    "closes": "21:00"
                  }
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "Restaurant",
                "name": "Hogis Luxury Suites",
                "image": "https://ordernow.hogisgroup.com/images/logo.webp",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Diamond Hill",
                  "addressLocality": "Calabar",
                  "addressRegion": "Cross River",
                  "addressCountry": "NG"
                },
                "url": "https://ordernow.hogisgroup.com",
                "telephone": "+234-703-456-7890",
                "servesCuisine": ["Nigerian", "International"],
                "priceRange": "₦₦-₦₦₦",
                "openingHoursSpecification": [
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "opens": "08:00",
                    "closes": "22:00"
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "Saturday",
                    "opens": "09:00",
                    "closes": "23:00"
                  },
                  {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": "Sunday",
                    "opens": "10:00",
                    "closes": "21:00"
                  }
                ]
              }
            ])
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <ClerkProvider
          appearance={{
            elements: {
              modalBackdrop: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
              },
              modalContent: {
                margin: 'auto',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
              },
              modal: {
                position: 'relative',
                margin: 'auto',
                maxWidth: '100%',
                width: '100%',
                '@media (min-width: 640px)': {
                  width: 'auto',
                  minWidth: '400px',
                },
              },
            },
          }}
        >
          <ConvexClientProvider>
            <OrderProvider>
              <UIProvider>
                <LayoutClientWrapper>
                  {children}
                </LayoutClientWrapper>
              </UIProvider>
            </OrderProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
