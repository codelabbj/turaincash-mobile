"use client"

import type React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"
import { useState, useEffect } from "react"
import ErrorBoundary from "./error-boundary"
import { notificationService } from "@/lib/firebase-notifications"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    notificationService.initialize();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#333",
                  color: "#fff",
                },
              }}
            />
          </I18nextProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
