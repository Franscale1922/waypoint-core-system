import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Waypoint Franchise Advisors | Franchise Guidance from Whitefish, MT",
  description:
    "Free franchise consulting from a former Bloomin' Blinds franchisor. Find the franchise that fits your life, capital, and goals. Book a free discovery call.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${inter.className} bg-white text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}
