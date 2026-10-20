import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "@fontsource/redaction-70/700.css";
import "./globals.css";
import { Suspense } from "react";
import { Navigation } from "./components/navigation";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Humor Project",
  description: "Create and rate AI captions for campus life, dorms, and NYC.",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<div className="page-shell">The Humor Project</div>}><Navigation /></Suspense>
        {children}
        {modal}
      </body>
    </html>
  );
}
