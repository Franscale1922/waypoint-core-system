import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { localBusinessSchema, personSchema } from "./lib/structured-data";
import { GA_ID } from "./lib/analytics";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const SITE_URL = "https://waypointfranchise.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Waypoint Franchise Advisors | Franchise Guidance from Whitefish, MT",
    template: "%s | Waypoint Franchise Advisors",
  },
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor. I've helped 146+ owners find and start the right franchise. Book a free discovery call.",
  keywords: [
    "franchise consultant",
    "franchise advisor",
    "buy a franchise",
    "franchise opportunities",
    "franchise consulting free",
    "how to buy a franchise",
    "Kelsey Stuart franchise",
    "Whitefish Montana",
  ],
  authors: [{ name: "Kelsey Stuart", url: `${SITE_URL}/about` }],
  creator: "Kelsey Stuart",
  publisher: "Waypoint Franchise Advisors",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Waypoint Franchise Advisors",
    title: "Find the Franchise That Fits Your Life | Waypoint Franchise Advisors",
    description:
      "Free franchise consulting from a former franchisor who's been on both sides. I'll tell you what actually fits, or tell you it's not the right move. No pitch, no pressure.",
    images: [
      {
        url: `/og_default_1773343895292.png`,
        width: 1200,
        height: 630,
        alt: "Waypoint Franchise Advisors — Whitefish, Montana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find the Franchise That Fits Your Life | Waypoint",
    description:
      "Free franchise consulting. 146+ owners helped. No pitch, no pressure. Book a free discovery call.",
    images: [`/og_default_1773343895292.png`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${inter.className} bg-white text-slate-900`}
      >
        {children}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
