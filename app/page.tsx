"use client"

import { useEffect } from "react"
import { isAuthenticated } from "@/lib/auth"
import { checkForUpdates } from '@/lib/updater';

export default function HomePage() {
  useEffect(() => {
    void checkForUpdates()
    // Navigation hard : router.push casse souvent dans le WebView Capacitor (static export).
    const target = isAuthenticated() ? "/dashboard/" : "/login/"
    window.location.replace(target)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-muted-foreground">Redirection...</p>
      </div>
    </div>
  )
}

