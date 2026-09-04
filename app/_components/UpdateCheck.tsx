"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Download } from "lucide-react"
import { SETTINGS_V2 } from "@/hooks/use-settings"
import api from "@/lib/api"
import { compareVersions } from "@/lib/version-check"

async function downloadViaCapacitorBrowser(apkUrl: string): Promise<boolean> {
  try {
    const { Browser } = await import("@capacitor/browser")
    await Browser.open({ url: apkUrl })
    return true
  } catch {
    return false
  }
}

function downloadViaWindowOpen(apkUrl: string): boolean {
  try {
    const w = window.open(apkUrl, "_blank")
    return Boolean(w)
  } catch {
    return false
  }
}

async function downloadAndInstall(apkUrl: string) {
  if (await downloadViaCapacitorBrowser(apkUrl)) return
  if (downloadViaWindowOpen(apkUrl)) return
  window.location.href = apkUrl
}

async function getInstalledVersion(): Promise<string> {
  try {
    const { Capacitor } = await import("@capacitor/core")
    if (Capacitor.isNativePlatform()) {
      const { App } = await import("@capacitor/app")
      const info = await App.getInfo()
      return String(info.build || info.version || "0")
    }
  } catch {
    // ignore
  }
  return (
    localStorage.getItem("installed_app_version") ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "0"
  )
}

/**
 * Modal d'update pour les builds qui n'ont pas encore AppVersionGate,
 * et fallback si settings/manifest indique une nouvelle APK.
 */
export function UpdateCheck() {
  const [show, setShow] = useState(false)
  const [apkUrl, setApkUrl] = useState("")
  const [latestVersion, setLatestVersion] = useState("")
  const [installedVersion, setInstalledVersion] = useState("")
  const [mounted, setMounted] = useState(false)
  const [force, setForce] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false

    const run = async () => {
      try {
        const installed = await getInstalledVersion()
        if (cancelled) return
        setInstalledVersion(installed)

        let remoteVersion = ""
        let remoteApk = ""
        let remoteForce = false

        // 1) Settings backend (flux Blaffa)
        try {
          const res = await api.get(SETTINGS_V2)
          const settings = Array.isArray(res.data) ? res.data[0] : res.data
          remoteVersion = String(
            settings?.last_version ?? settings?.min_version ?? ""
          )
          remoteApk = String(settings?.dowload_apk_link || "")
          if (settings?.min_version != null && compareVersions(settings.min_version, installed) > 0) {
            remoteForce = true
          }
          if (settings?.last_version != null && compareVersions(settings.last_version, installed) > 0) {
            remoteForce = true
          }
        } catch (e) {
          console.warn("[UpdateCheck] settings failed, fallback manifest", e)
        }

        // 2) Manifest Vercel (anciennes installs)
        try {
          const manRes = await fetch(
            "https://turnaicash-mobile-app-1.vercel.app/releases/manifest.json",
            { cache: "no-store" }
          )
          const manifest = await manRes.json()
          if (!remoteVersion) {
            remoteVersion = String(manifest.android_version || manifest.version || "")
          }
          if (!remoteApk) {
            remoteApk = String(manifest.apk_url || "")
          }
          if (manifest.force === true) remoteForce = true
        } catch (e) {
          console.warn("[UpdateCheck] manifest failed", e)
        }

        if (!remoteVersion || !remoteApk) return

        const needsUpdate = compareVersions(remoteVersion, installed) > 0
        if (!needsUpdate) {
          localStorage.setItem("installed_app_version", remoteVersion)
          return
        }

        const dismissed = localStorage.getItem("app_dismissed_version")
        if (!remoteForce && dismissed === remoteVersion) return

        localStorage.setItem("latest_app_version", remoteVersion)
        localStorage.setItem("download_apk_link", remoteApk)
        localStorage.setItem("installed_app_version", installed)

        if (cancelled) return
        setLatestVersion(remoteVersion)
        setApkUrl(remoteApk)
        setForce(remoteForce)
        setShow(true)
      } catch (error) {
        console.error("[UpdateCheck] error", error)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const handleClose = () => {
    if (force) return
    if (latestVersion) localStorage.setItem("app_dismissed_version", latestVersion)
    setShow(false)
  }

  const handleDownload = () => {
    void downloadAndInstall(apkUrl)
  }

  if (!show || !mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="relative z-[10000] w-full max-w-md rounded-xl bg-white p-5 text-center shadow-2xl dark:bg-gray-800">
        {!force && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        <h1 className="pr-8 text-lg font-bold dark:text-white">
          Nouvelle mise à jour disponible
        </h1>
        <p className="mt-2 mb-2 text-sm dark:text-gray-300">
          Une nouvelle version de TURAINCASH est disponible.
          {force
            ? " Cette mise à jour est obligatoire pour continuer."
            : " Installez-la pour profiter des dernières améliorations."}
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Actuelle: <span className="font-mono">{installedVersion}</span>
          {latestVersion && (
            <>
              {" "}
              → Nouvelle:{" "}
              <span className="font-mono font-bold text-primary">{latestVersion}</span>
            </>
          )}
        </p>

        <div className="flex justify-center gap-3">
          {!force && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Plus tard
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
