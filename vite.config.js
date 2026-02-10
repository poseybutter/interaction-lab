import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Interaction Lab 전용 Viewer (React) + /content 순수 산출물 구조
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html"
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
});
