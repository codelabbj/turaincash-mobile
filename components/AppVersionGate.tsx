"use client"

import React from "react"

/**
 * Force-update APK désactivé (boucle Capgo / gate).
 * Passe toujours les children.
 */
export function AppVersionGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
