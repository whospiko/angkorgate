import type { Metadata } from "next";
import { AngkorGateProvider } from "@angkorgate/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AngkorGate + Next.js SDK Example",
  description:
    "Fullstack Next.js example using @angkorgate/nextjs SDK and better-sqlite3.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AngkorGateProvider
          clientId={process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || "demo-app"}
          baseUrl={
            process.env.NEXT_PUBLIC_ANGKORGATE_URL || "http://localhost:8080"
          }
          consoleUrl={
            process.env.NEXT_PUBLIC_ANGKORGATE_CONSOLE_URL ||
            "http://localhost:4000"
          }
        >
          {children}
        </AngkorGateProvider>
      </body>
    </html>
  );
}
