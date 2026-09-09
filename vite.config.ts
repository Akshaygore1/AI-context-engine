import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  server: {
    port: 5173,
    proxy: {
      "/personalize": "http://localhost:3001",
      "/debug": "http://localhost:3001",
      "/generation": "http://localhost:3001",
      "/health": "http://localhost:3001"
    },
  },
});
