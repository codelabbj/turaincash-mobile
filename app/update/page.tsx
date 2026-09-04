"use client"

import React from "react"
import { Download, AlertCircle, RefreshCw } from "lucide-react"

export default function UpdatePage() {
  const [installedVersion, setInstalledVersion] = React.useState("1.0.0")
  const [latestVersion, setLatestVersion] = React.useState("")
  const [downloadUrl, setDownloadUrl] = React.useState("")

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const installed =
      localStorage.getItem("installed_app_version_name") ||
      localStorage.getItem("installed_app_version") ||
      ""
    const latest = localStorage.getItem("latest_app_version") || ""
    const apkUrl =
      localStorage.getItem("download_apk_link") ||
      `${window.location.origin}/turaincash-mobile.apk`

    setInstalledVersion(installed)
    setLatestVersion(latest)
    setDownloadUrl(apkUrl)
  }, [])

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    const targetUrl =
      downloadUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/turaincash-mobile.apk`
        : "")
    if (!targetUrl) return

    try {
      const { Browser } = await import("@capacitor/browser")
      await Browser.open({ url: targetUrl })
    } catch (error) {
      console.error("Failed to open browser:", error)
      window.open(targetUrl, "_blank")
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 text-center">
      <div className="absolute right-[-10%] top-[-10%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative rounded-full bg-primary p-6 shadow-2xl shadow-primary/30">
              <RefreshCw className="h-12 w-12 animate-spin text-primary-foreground [animation-duration:8s]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Mise à jour requise
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Une nouvelle version de{" "}
            <span className="font-semibold text-primary">TURAINCASH</span> est
            disponible. Veuillez installer la dernière mise à jour pour continuer
            à utiliser l&apos;application.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card/80 p-5 text-left backdrop-blur-md">
          <div className="flex items-center gap-3 text-primary">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">Pourquoi mettre à jour ?</span>
          </div>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Amélioration des performances et de la stabilité</li>
            <li>Nouvelles fonctionnalités de sécurité</li>
            <li>Correction de bugs importants</li>
            <li>Meilleure expérience utilisateur</li>
          </ul>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={handleDownload}
            className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:opacity-90 active:scale-95"
          >
            <Download className="h-5 w-5 transition-transform group-hover:translate-y-1" />
            Télécharger la mise à jour
          </button>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>
              Version actuelle:{" "}
              <span className="font-mono font-medium">{installedVersion}</span>
            </span>
            {latestVersion && latestVersion !== installedVersion && (
              <span>
                • Nouvelle version:{" "}
                <span className="font-mono font-bold text-primary">
                  {latestVersion}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
