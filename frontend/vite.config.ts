import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Le backend FastAPI sert l'API sous /api/v1
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});