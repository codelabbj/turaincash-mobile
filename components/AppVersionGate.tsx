"use client"

import React, { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Même logique que Blaffa : si settings.last_version / min_version > version installée,
 * on force la page /update et on bloque le reste de l'app.
 */
export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [checkingUpdate, setCheckingUpdate] = useState(true)
  const [isUpdateRequired, setIsUpdateRequired] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkUpdate = async () => {
      try {
        const { checkAppVersion } = await import("@/lib/version-check")
        const res = await checkAppVersion()
        if (cancelled) return

        const isUpdatePage = window.location.pathname.includes("/update")

        // Forcer seulement en natif (les anciennes APK + nouvelles). Le web reste accessible.
        if (res.isUpdateRequired && res.isNative) {
          setIsUpdateRequired(true)
          if (!isUpdatePage) {
            window.location.replace("/update/")
          }
        } else {
          setIsUpdateRequired(false)
          if (isUpdatePage && res.isNative) {
            window.location.replace("/")
          }
        }
      } catch (err) {
        console.error("Failed to check app update:", err)
      } finally {
        if (!cancelled) setCheckingUpdate(false)
      }
    }

    void checkUpdate()
    return () => {
      cancelled = true
    }
  }, [])

  const onUpdatePage = pathname?.includes("/update")

  if (checkingUpdate || (isUpdateRequired && !onUpdatePage)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
