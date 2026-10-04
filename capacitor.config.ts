import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.reclaim.marketplace",
  appName: "Reclaim",
  webDir: "build",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#f4f5f0",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f4f5f0"
    }
  }
};

export default config;
