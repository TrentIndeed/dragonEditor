import { Geist_Mono, Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import {
  StoreInitializer,
  BackgroundUploadRunner,
} from "@/components/store-initializer";
import { QueryProvider } from "@/components/query-provider";
import { Outfit } from "next/font/google";
import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dragon Editor — AI Video Editor",
  description: "AI-powered video editing pipeline",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} ${geist.variable} ${outfit.variable} antialiased bg-muted`}
        style={{ fontFamily: "var(--font-geist), system-ui, sans-serif" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <StoreInitializer />
            <BackgroundUploadRunner />
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
