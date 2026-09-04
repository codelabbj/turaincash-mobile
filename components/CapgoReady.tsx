"use client"

import { useEffect } from "react"

/**
 * Obligatoire pour Capgo : sans notifyAppReady() l'OTA est rollback (~10s)
 * et l'ancienne app (sans modal update) revient.
 */
export function CapgoReady() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor.isNativePlatform()) return
        const { CapacitorUpdater } = await import("@capgo/capacitor-updater")
        if (cancelled) return
        await CapacitorUpdater.notifyAppReady()
        console.log("[Capgo] notifyAppReady OK")
      } catch (e) {
        console.warn("[Capgo] notifyAppReady failed", e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
