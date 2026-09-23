import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { ClientLayoutWrapper } from "./ClientLayoutWrapper"
import NextTopLoader from 'nextjs-toploader'
import { createClient } from '@/lib/supabase/server'
import { getCurrentEmployee } from '@/lib/auth'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IMS Portal",
  description: "Integrated Management System",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const employee = await getCurrentEmployee(supabase)
  
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${outfit.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextTopLoader color="hsl(var(--primary))" showSpinner={false} />
        <ClientLayoutWrapper employee={employee}>{children}</ClientLayoutWrapper>
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  );
}
