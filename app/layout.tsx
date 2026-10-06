import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/redaction-70/700.css";
import "@fontsource/redaction-100/700.css";
import "./globals.css";
import { Suspense } from "react";
import { Navigation } from "./components/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "Serious studies. Unserious captions. A little perspective for your next study break.",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<div className="page-shell">The Humor Project</div>}><Navigation /></Suspense>
        {children}
        {modal}
      </body>
    </html>
  );
}
