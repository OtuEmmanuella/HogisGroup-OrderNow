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
  title: "Hogis OrderNow",
  description: "Order delicious food from Hogis branches easily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
              },
              modalContent: {
                margin: 'auto',
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
