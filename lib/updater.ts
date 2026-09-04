import { CapacitorUpdater } from "@capgo/capacitor-updater"

/**
 * OTA Capgo pour les anciennes installs qui appellent encore ce check au démarrage.
 * Après reload, AppVersionGate force le téléchargement APK si last_version > build.
 */
export async function checkForUpdates() {
  try {
    const response = await fetch(
      "https://turnaicash-mobile-app-1.vercel.app/releases/manifest.json",
      { cache: "no-store" }
    )
    const manifest = await response.json()

    const remoteVersion = String(manifest.version || "")
    const remoteUrl = String(manifest.url || "")
    if (!remoteVersion || !remoteUrl) {
      console.log("[Capgo] No OTA bundle in manifest, skip")
      return
    }

    const localVersion = localStorage.getItem("app_version") || "0.0.0"
    if (remoteVersion === localVersion) {
      console.log("[Capgo] App web bundle is up to date")
      return
    }

    console.log(`[Capgo] New bundle ${remoteVersion} found, downloading...`)
    const result = await CapacitorUpdater.download({
      url: remoteUrl,
      version: remoteVersion,
    })

    if (result?.id) {
      await CapacitorUpdater.set({ id: result.id })
      localStorage.setItem("app_version", remoteVersion)
      await CapacitorUpdater.reload()
    }
  } catch (error) {
    console.error("[Capgo] Update check failed:", error)
  }
}
