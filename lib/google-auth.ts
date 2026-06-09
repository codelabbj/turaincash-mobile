import { Capacitor } from "@capacitor/core"
import api from "./api"
import { saveAuthData, type AuthResponse } from "./auth"

export interface GoogleAuthResult {
  success: boolean
  error?: string
}

/**
 * Lance le flow Google Sign-In adapté à la plateforme :
 * - Android/iOS : utilise @codetrix-studio/capacitor-google-auth (natif)
 * - Web          : ouvre un popup Google Identity Services
 *
 * Dans les deux cas, récupère un idToken et l'envoie à POST /auth/google.
 * Retourne { success: true } si la connexion réussit.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const platform = Capacitor.getPlatform()

  try {
    let idToken: string | null = null

    if (platform === "android" || platform === "ios") {
      // ─── Flow natif Capacitor ──────────────────────────────────────────
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      await GoogleAuth.initialize({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      })

      const googleUser = await GoogleAuth.signIn()

      // Le idToken est dans authentication.idToken
      idToken = googleUser?.authentication?.idToken ?? null

      if (!idToken) {
        return { success: false, error: "Impossible d'obtenir le token Google" }
      }
    } else {
      // ─── Flow web : Google Identity Services via prompt ────────────────
      // On utilise une Promise pour récupérer le credential depuis le callback
      idToken = await new Promise<string | null>((resolve) => {
        if (typeof window === "undefined" || !(window as any).google) {
          resolve(null)
          return
        }

        ;(window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          callback: (response: { credential: string }) => {
            resolve(response.credential)
          },
        })

        ;(window as any).google.accounts.id.prompt((notification: any) => {
          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment()
          ) {
            // L'utilisateur a fermé le prompt ou il n'a pas affiché
            resolve(null)
          }
        })
      })

      if (!idToken) {
        return {
          success: false,
          error: "Connexion Google annulée",
        }
      }
    }

    // ─── Envoi au backend ───────────────────────────────────────────────
    const response = await api.post<AuthResponse>("/auth/google", {
      id_token: idToken,
    })

    saveAuthData(response.data)

    return { success: true }
  } catch (error: any) {
    const message =
      error?.message ||
      error?.error ||
      "Erreur lors de la connexion avec Google"
    return { success: false, error: message }
  }
}
