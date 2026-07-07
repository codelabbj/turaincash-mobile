import { Capacitor } from "@capacitor/core"
import { saveAuthData } from "./auth"
import api from "./api"

interface GoogleSignInResult {
  success: boolean
  error?: string
}

/**
 * Sign in with Google using Capacitor GoogleAuth plugin (Android/iOS)
 * or browser-based flow (web). Sends the ID token to the backend for
 * verification and returns JWT tokens.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const platform = Capacitor.getPlatform()

    let idToken: string | null = null

    if (platform === "web") {
      // Web: dynamically import GoogleAuth for web fallback
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      await GoogleAuth.initialize()
      const user = await GoogleAuth.signIn()
      idToken = user?.authentication?.idToken ?? null
    } else {
      // Android / iOS: use Capacitor native plugin
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      const user = await GoogleAuth.signIn()
      idToken = user?.authentication?.idToken ?? null
    }

    if (!idToken) {
      return { success: false, error: "Impossible d'obtenir le token Google" }
    }

    // Send ID token to the backend for verification and JWT issuance
    const response = await api.post("/auth/google/", { id_token: idToken })

    if (response.data) {
      saveAuthData(response.data)
      return { success: true }
    }

    return { success: false, error: "Réponse invalide du serveur" }
  } catch (err: unknown) {
    console.error("Google sign-in error:", err)

    // User cancelled the sign-in flow — not an error worth showing
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "12501"
    ) {
      return { success: false, error: "Connexion annulée" }
    }

    const message =
      (err as { message?: string })?.message ||
      "Erreur lors de la connexion avec Google"

    return { success: false, error: message }
  }
}
