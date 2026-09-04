"use client"

import React, { useEffect, useState } from "react"
import UpdatePage from "@/app/update/page"

const CHECK_TIMEOUT_MS = 8000

/**
 * Si settings.last_version / min_version > version installée (natif),
 * on affiche directement l'écran de mise à jour (pas de redirect Capacitor
 * qui laissait un loader infini).
 */
export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const [checkingUpdate, setCheckingUpdate] = useState(true)
  const [isUpdateRequired, setIsUpdateRequired] = useState(false)

  useEffect(() => {
    let cancelled = false

    const finish = (required: boolean) => {
      if (cancelled) return
      setIsUpdateRequired(required)
      setCheckingUpdate(false)
    }

    const timeoutId = window.setTimeout(() => {
      console.warn("[AppVersionGate] version check timeout — continue without blocking")
      finish(false)
    }, CHECK_TIMEOUT_MS)

    const checkUpdate = async () => {
      try {
        const { checkAppVersion } = await import("@/lib/version-check")
        const res = await checkAppVersion()
        if (cancelled) return
        // Forcer seulement en natif
        finish(Boolean(res.isUpdateRequired && res.isNative))
      } catch (err) {
        console.error("Failed to check app update:", err)
        finish(false)
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void checkUpdate()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  if (checkingUpdate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isUpdateRequired) {
    return <UpdatePage />
  }

  return <>{children}</>
}
