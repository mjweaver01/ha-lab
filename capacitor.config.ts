import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "lab.homeassist.app",
  appName: "Home Assistant Lab",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
};

export default config;
