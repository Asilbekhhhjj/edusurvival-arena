import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production-optimized Vite config (viteSingleFile OLIB TASHLANDI — chunking yaxshiroq)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,       // production da sourcemap yo'q (xavfsizlik)
    minify: "esbuild",      // tezkor minifikatsiya
    target: "es2020",
    cssCodeSplit: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        // Code splitting — 24,000 foydalanuvchi uchun parallel yuklash
        manualChunks: {
          vendor: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          state: ["zustand"],
        },
        // Cache busting uchun hash
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
