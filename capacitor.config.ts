import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.turnaicash.app",
  appName: "TURAINCASH",
  webDir: "out",
  //bundledWebRuntime: false,
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: false
  //   }
  // },
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: true,
  //     server: "https://turnaicash-mobile-app-1-p3ef20nbk-codelabbjgmailcoms-projects.vercel.app",
  //   }
  // },
  server: {
    // androidScheme: "https",
    url: "https://turnaicash-mobile-app-1.vercel.app",
    cleartext: false
  },
}

export default config
