import localFont from "next/font/local"
import { JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const ggSans = localFont({
  src: [
    {
      path: "../public/fonts/gg-sans/ggsans-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/gg-sans/ggsans-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/gg-sans/ggsans-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/gg-sans/ggsans-700.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/gg-sans/ggsans-800.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "block",
  preload: true,
  adjustFontFallback: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "block",
  preload: true,
  adjustFontFallback: false,
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased", ggSans.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
