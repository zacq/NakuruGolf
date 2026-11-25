import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import MobileBar from "@/components/MobileBar";
import SwRegister from "@/components/SwRegister";
import { ensureSeed } from "@/lib/seed";
import { CLUB } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(CLUB.url),
  title: {
    default: "Nakuru Golf Club — golf, events, stay, dine & car wash in Nakuru",
    template: "%s | Nakuru Golf Club",
  },
  description:
    "Nakuru Golf Club: register for golf tournaments, book a room, reserve a table, book a car wash or tee time, and pay by M-Pesa. Behind Nakuru Show Ground, Showground Road.",
  applicationName: "Nakuru Golf Club",
  manifest: "/manifest.webmanifest",
  openGraph: { type: "website", siteName: "Nakuru Golf Club", locale: "en_KE" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Nakuru Golf", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a2c1e",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureSeed();
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3">
          Skip to content
        </a>
        <CartProvider>
          {children}
          <MobileBar />
        </CartProvider>
        <SwRegister />
        {ga && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}');`}</Script>
          </>
        )}
        {pixel && (
          <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}</Script>
        )}
      </body>
    </html>
  );
}
