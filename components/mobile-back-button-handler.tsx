"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { mobileBackButtonHandler } from "@/lib/mobile-back-button"
import { isAuthenticated } from "@/lib/auth"
import { App } from "@capacitor/app"

export function MobileBackButtonHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  // Keep pathname ref up to date
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const handleBackButton = (e?: Event) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      const currentPath = pathnameRef.current
      
      // If user is on a root screen (/dashboard, /login, or /), exit the app natively
      if (currentPath === "/dashboard" || currentPath === "/login" || currentPath === "/") {
        App.exitApp()
        return
      }

      // If user is on a sub-screen, go to dashboard if authenticated, or login if not
      if (isAuthenticated()) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }

    // Initialize mobile back button handler
    mobileBackButtonHandler.initialize(handleBackButton)

    // Update callback when pathname changes
    mobileBackButtonHandler.setCallback(handleBackButton)

    // Cleanup on unmount
    return () => {
      mobileBackButtonHandler.cleanup()
    }
  }, [router])

  return null
}

