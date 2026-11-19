import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paylance — Where Talent Meets Capital, Instantly. Globally.",
  description: "AI-powered global talent marketplace with ILP-native cross-border payments. Work first, get paid automatically. No invoices. No ghosting. No banks.",
  keywords: "freelance marketplace, AI talent matching, cross-border payments, ILP, interledger, remote work, global hiring",
  openGraph: {
    title: "Paylance",
    description: "Where Talent Meets Capital, Instantly. Globally.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
