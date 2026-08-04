import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.turaincash.android",
  appName: "TURAINCASH",
  webDir: "out",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // Client ID Web (pour le web fallback et la vérification serveur)
      // clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "484514830460-v2qnn4lrsbiesfatki7qjgnl8d6s82ig.apps.googleusercontent.com",
      //clientId: "665076337085-nh3htf0hqrueon1l2btutdctvb7l54b0.apps.googleusercontent.com",
      // Pour Android, le serverClientId est le Client ID Web
      // serverClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "484514830460-6eh6ig4adkdhg2sa14lusfair1q5ev48.apps.googleusercontent.com",
      serverClientId: "665076337085-k6rg6df0pj78ho1m93c0q8nguh550tid.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
  // server: {
  //   // androidScheme: "https",
  //   url: "https://turnaicash-mobile-app-1.vercel.app",
  //   cleartext: false
  // },
}

export default config

