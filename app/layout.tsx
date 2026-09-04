import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { AppVersionGate } from "@/components/AppVersionGate"
import { CapgoReady } from "@/components/CapgoReady"
import { UpdateCheck } from "@/app/_components/UpdateCheck"
import { MobileBackButtonHandler } from "@/components/mobile-back-button-handler"
import NotificationChannelDialog from "@/components/NotificationChannelDialog"
const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TURAINCASH - Dépôt et Retrait",
  description: "Application de gestion de dépôts et retraits pour paris sportifs",

  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#00FFFF",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TURAINCASH",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`font-sans antialiased touch-manipulation select-none`}>

        {/* Google Identity Services — nécessaire pour le Sign-In sur web/PWA */}
        <script src="https://accounts.google.com/gsi/client" async defer />
        <Providers>
          <CapgoReady />
          <MobileBackButtonHandler />
          <AppVersionGate>
            <UpdateCheck />
            {children}
            <NotificationChannelDialog />
            <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
              Développé par{" "}
              <a
                href="https://codelab.bj/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Code Lab
              </a>
            </footer>
          </AppVersionGate>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
