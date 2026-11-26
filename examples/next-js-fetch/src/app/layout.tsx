import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AngkorGate + Next.js (Fetch Auth)",
  description:
    "Frontend-only Next.js TypeScript example protecting /dashboard using native fetch against AngkorGate Core.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
