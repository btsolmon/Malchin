import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono-body",
});

const siteTitle = "Малчин / Nomad";
const siteDescription =
  "Монгол нүүдэлчний survival тоглоом. Сүргээ хамгаал, өвгөнөөс сур, Төмөр шулмасыг дийлээд гэр бүлээ буцааж ав. A Mongolian herder survival game in the browser.";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  applicationName: "Малчин",
  keywords: [
    "Малчин",
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
    siteName: "Малчин",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  appleWebApp: {
    capable: true,
    title: "Малчин",
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
    <html
      lang="mn"
      className={`${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
