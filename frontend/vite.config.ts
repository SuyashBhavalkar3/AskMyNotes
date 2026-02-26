import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Proxy API requests to the backend during development
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/voice": {
        target: process.env.VITE_VOICE_URL || "http://localhost:5001",
        changeOrigin: true,
        secure: false,
        onError(err: any, req: any, res: any) {
          console.error("voice proxy error", err?.message || err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Voice backend unreachable");
        },
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
