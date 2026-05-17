import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Itinera — Descubre Honduras",
  description: "Tu guía cultural inteligente para Honduras. Explorado por IA. Narrado por la historia. Ruinas de Copán, Playa West Bay, historias mayas y más.",
  keywords: ["Honduras", "turismo cultural", "guía IA", "Copán", "Roatán", "WRO 2026"],
  authors: [{ name: "INNOVAKERS · UNICAH" }],
  openGraph: {
    title: "Itinera — Descubre Honduras",
    description: "Tu guía cultural inteligente para Honduras. Explorado por IA. Narrado por la historia.",
    url: "https://itinera-suite-wro-senior-future-inn.vercel.app",
    siteName: "Itinera",
    locale: "es_HN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Itinera — Descubre Honduras",
    description: "Tu guía cultural inteligente para Honduras. Explorado por IA.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F8FAFC] text-[#0F172A] font-inter">
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
