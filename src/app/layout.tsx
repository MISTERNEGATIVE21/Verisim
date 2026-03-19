import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VerilogSim IDE - HDL Development Environment",
  description: "A professional, self-hosted Verilog simulation environment with real-time waveform viewing and integrated Icarus Verilog support.",
  keywords: ["Verilog", "HDL", "Simulation", "Icarus Verilog", "Waveform", "Digital Logic", "IDE"],
  authors: [{ name: "misternegative21" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "VerilogSim IDE",
    description: "Modern Verilog IDE with real-time waveforms",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
