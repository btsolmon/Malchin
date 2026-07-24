import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Малчин — Survival",
  description:
    "Монгол малчны амьдрал: сүрэг хамгаалах, чонотой тулалдах, 1000 хонь цуглуулах",
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
