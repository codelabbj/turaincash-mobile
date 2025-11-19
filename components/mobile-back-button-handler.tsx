"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { mobileBackButtonHandler } from "@/lib/mobile-back-button"
import { isAuthenticated } from "@/lib/auth"

export function MobileBackButtonHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  // Keep pathname ref up to date
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    // Push history state to prevent browser back navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'app' }, '', window.location.href)
    }

    const handleBackButton = (e?: Event) => {
      // Always prevent default browser back behavior
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      const currentPath = pathnameRef.current
      
      // CRITICAL: If authenticated, ALWAYS navigate to dashboard (NEVER allow exit)
      if (isAuthenticated()) {
        // Push history state to prevent browser back navigation
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
        
        // Always navigate to dashboard, even if already there
        // This prevents the app from exiting
        if (currentPath !== "/dashboard") {
          router.push("/dashboard")
        } else {
          // If already on dashboard, push state again to prevent exit
          if (typeof window !== 'undefined') {
            window.history.pushState({ screen: 'app' }, '', window.location.href)
          }
        }
        return // Always return early for authenticated users
      }
      
      // If not authenticated and not on login/root, go to login
      if (!isAuthenticated() && currentPath !== "/login" && currentPath !== "/") {
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
        router.push("/login")
        return
      }
      
      // Only allow exit if not authenticated and on login/root screen
      // For authenticated users, we never allow exit - always go to dashboard
      if (!isAuthenticated() && (currentPath === "/login" || currentPath === "/")) {
        // Allow natural exit only for unauthenticated users on login/root
        return
      }
      
      // Fallback: navigate to appropriate screen
      if (isAuthenticated()) {
        // Push history state to prevent browser back
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
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
  }, [router, pathname])

  return null
}

