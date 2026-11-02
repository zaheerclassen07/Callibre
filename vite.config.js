import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { APP_NAME, APP_TAGLINE } from "./src/config.js";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000
  },
  preview: {
    host: "0.0.0.0",
    port: 3000
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: `${APP_NAME} \u2013 ${APP_TAGLINE}`,
        short_name: APP_NAME,
        start_url: "/",
        display: "standalone",
        background_color: "#0B1220",
        theme_color: "#0B1220",
        lang: "en",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      }
    })
  ]
});
