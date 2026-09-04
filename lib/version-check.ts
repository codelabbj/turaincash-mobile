import api from "@/lib/api"
import { SETTINGS_V2 } from "@/hooks/use-settings"

/**
 * Compare two version strings or numbers (e.g., "1.0.2" vs "1.0.0" or 6 vs 5)
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string | number, v2: string | number): number {
  const s1 = String(v1 ?? "").trim()
  const s2 = String(v2 ?? "").trim()

  if (!s1 && !s2) return 0
  if (!s1) return -1
  if (!s2) return 1

  const p1 = s1.split(".").map((n) => parseInt(n, 10) || 0)
  const p2 = s2.split(".").map((n) => parseInt(n, 10) || 0)

  const maxLen = Math.max(p1.length, p2.length)
  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] || 0
    const num2 = p2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }

  return 0
}

export interface VersionCheckResult {
  isUpdateRequired: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  isNative: boolean
}

async function fetchMobileSettings(): Promise<Record<string, any>> {
  const response = await api.get(SETTINGS_V2)
  const data = response.data
  if (Array.isArray(data)) return (data[0] as Record<string, any>) || {}
  return (data as Record<string, any>) || {}
}

export async function checkAppVersion(): Promise<VersionCheckResult> {
  let currentVersion = "1.0.0"
  let currentBuild = ""
  let isNative = false

  try {
    const { Capacitor } = await import("@capacitor/core")
    isNative = Capacitor.isNativePlatform()

    const { App } = await import("@capacitor/app")
    const info = await App.getInfo()
    if (info.version) currentVersion = info.version
    if (info.build) currentBuild = String(info.build)
  } catch {
    // Web / non-native fallback
  }

  let latestVersion = currentVersion
  let downloadUrl = ""
  let isUpdateRequired = false

  try {
    const settings = await fetchMobileSettings()
    const serverVer =
      settings.last_version ??
      settings.min_version ??
      settings.version ??
      settings.app_version
    const apkLink =
      settings.dowload_apk_link ||
      settings.download_apk_link ||
      settings.apk_url

    if (apkLink) {
      downloadUrl = String(apkLink)
      localStorage.setItem("download_apk_link", downloadUrl)
    }

    if (serverVer != null && serverVer !== "") {
      latestVersion = String(serverVer)
      // Prefer versionCode (build) when server stores integer codes like Blaffa/mobcash admin
      const installedForCompare = currentBuild || currentVersion
      localStorage.setItem("latest_app_version", latestVersion)
      localStorage.setItem("installed_app_version", installedForCompare)
      localStorage.setItem("installed_app_version_name", currentVersion)

      if (compareVersions(latestVersion, installedForCompare) > 0) {
        isUpdateRequired = true
      }
    }
  } catch (error) {
    console.error("[VersionCheck] Failed to fetch settings for version check:", error)
  }

  return {
    isUpdateRequired,
    currentVersion: currentBuild || currentVersion,
    latestVersion,
    downloadUrl:
      downloadUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/turaincash-mobile.apk`
        : ""),
    isNative,
  }
}
