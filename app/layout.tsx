import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SLUG } from "./constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatter",
  description: "Free hat",
  icons: {
    icon: [
      { url: `/${SLUG}/favicon.ico` },
      { url: `/${SLUG}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `/${SLUG}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: `/${SLUG}/apple-touch-icon.png`,
  },
  manifest: `/${SLUG}/site.webmanifest`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
