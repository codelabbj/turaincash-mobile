import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { UpdateCheck } from "@/app/_components/UpdateCheck"
import { MobileBackButtonHandler } from "@/components/mobile-back-button-handler"
const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TURAINCASH - Dépôt et Retrait",
  description: "Application de gestion de dépôts et retraits pour paris sportifs",
  generator: "v0.app",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let isHandlingBackButton = false;
                
                function handleBackButton() {
                  if (isHandlingBackButton) return;
                  isHandlingBackButton = true;
                  
                  // Dispatch custom event for React to handle
                  window.dispatchEvent(new CustomEvent('mobileBackButton'));
                  
                  setTimeout(() => {
                    isHandlingBackButton = false;
                  }, 300);
                }
                
                // Listen for various back button events
                document.addEventListener('backbutton', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackButton();
                }, false);
                
                window.addEventListener('backbutton', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackButton();
                }, false);
                
                // Listen for browser back button - ALWAYS prevent default
                window.addEventListener('popstate', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Push current state back to prevent navigation
                  if (window.history.state === null) {
                    window.history.pushState({screen: 'app'}, '', window.location.href);
                  } else {
                    // Always push state to prevent back navigation
                    window.history.pushState({screen: 'app'}, '', window.location.href);
                  }
                  handleBackButton();
                });
                
                // Initialize history state
                if (window.history.state === null) {
                  window.history.replaceState({screen: 'app'}, '', window.location.href);
                }
              })();
            `,
          }}
        />
        <Providers>
          <MobileBackButtonHandler />
          <UpdateCheck />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
