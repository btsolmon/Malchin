import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteTitle = "The project — Нүүдэлчин";
const siteDescription =
  "Нүүдэлчин төслийн бүтээгчид, технологи, зураг, зорилго болон сургамжийг бүртгэх төсөл танилцуулах маягт.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  applicationName: "Нүүдэлчин",
  keywords: [
    "Нүүдэлчин",
    "Nomad",
    "Mongolia",
    "survival",
    "herder",
    "steppe",
    "browser game",
  ],
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    locale: "mn_MN",
    alternateLocale: ["en_US"],
    siteName: "Нүүдэлчин",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  appleWebApp: {
    capable: true,
    title: "Нүүдэлчин",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0806",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
