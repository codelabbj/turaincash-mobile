"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { checkForUpdates } from '@/lib/updater';

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkForUpdates();
    if (isAuthenticated()) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-muted-foreground">Redirection...</p>
      </div>
    </div>
  )
}
