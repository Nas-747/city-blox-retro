import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "City Blox Retro | Arcade Tower Builder",
  description: "A classic Nokia-style Tower Bloxx clone built with HTML5 Canvas, Next.js, and TypeScript.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full overflow-hidden bg-[#080b09] antialiased select-none`}
    >
      <body className="h-full overflow-hidden flex flex-col font-mono text-zinc-100 bg-[#080b09]">
        {/* Retro CRT Monitor overlay for immersion */}
        <div className="scanlines" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

