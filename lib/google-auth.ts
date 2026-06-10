import { Capacitor } from "@capacitor/core"
import api from "./api"
import { saveAuthData, type AuthResponse } from "./auth"

export interface GoogleAuthResult {
  success: boolean
  error?: string
}

/**
 * Lance le flow Google Sign-In adapté à la plateforme :
 * - Android/iOS : Capacitor GoogleAuth natif
 * - Web          : Popup OAuth2 classique via Google Identity Services
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const platform = Capacitor.getPlatform()

  try {
    let token: string | null = null

    if (platform === "android" || platform === "ios") {
      // ── Natif Capacitor ─────────────────────────────────────────────
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      // On Android/iOS, we initialize with the config from capacitor.config.ts/strings.xml
      // so we don't need to pass clientId here (it will use the serverClientId from config)
      await GoogleAuth.initialize()
      const googleUser = await GoogleAuth.signIn()
      console.log("Google user:", googleUser)
      token = googleUser?.serverAuthCode ?? googleUser?.authentication?.idToken ?? null

      if (!token) {
        return { success: false, error: "Impossible d'obtenir le token Google" }
      }
    } else {
      // ── Web : popup OAuth2 avec google.accounts.oauth2 ──────────────
      token = await googlePopupSignIn()

      if (!token) {
        return { success: false, error: "Connexion Google annulée" }
      }
    }

    // ── Envoi au backend ────────────────────────────────────────────
    const response = await api.post<AuthResponse>("/auth/google", {
      code: token,
    })
    saveAuthData(response.data)
    return { success: true }
  } catch (error: any) {
    console.error("Google auth error:", error)
    console.error("Error response:", error.response?.data)
    const message =
      error?.response?.data?.details ||
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message || error?.error || "Erreur lors de la connexion avec Google"
    return { success: false, error: message }
  }
}

/**
 * Ouvre une fenêtre popup Google OAuth2 et récupère le id_token.
 * Utilise le flow "token" (implicit) avec response_type=id_token.
 */
function googlePopupSignIn(): Promise<string | null> {
  return new Promise((resolve) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/auth/google/callback` : ""
    const nonce = Math.random().toString(36).slice(2)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      nonce,
      prompt: "select_account",
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(url, "google-signin", `width=${width},height=${height},left=${left},top=${top}`)

    if (!popup) {
      resolve(null)
      return
    }

    // Écoute le message envoyé par la page callback
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        window.removeEventListener("message", handler)
        resolve(event.data.idToken)
      }
      if (event.data?.type === "GOOGLE_AUTH_ERROR") {
        window.removeEventListener("message", handler)
        resolve(null)
      }
    }

    window.addEventListener("message", handler)

    // Timeout si l'utilisateur ferme le popup sans se connecter
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener("message", handler)
        resolve(null)
      }
    }, 500)
  })
}
