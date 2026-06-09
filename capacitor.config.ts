import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.turnaicash.app",
  appName: "TURAINCASH",
  webDir: "out",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // Client ID Web (pour le web fallback et la vérification serveur)
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      // Pour Android, le serverClientId est le Client ID Web
      serverClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      forceCodeForRefreshToken: true,
    },
  },
  server: {
    // androidScheme: "https",
    url: "https://turnaicash-mobile-app-1.vercel.app",
    cleartext: false
  },
}

export default config

