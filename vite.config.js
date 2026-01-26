import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  base: "/energy-transfer/",
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    entries: ["index.html"],
  },
  server: {
    fs: {
      deny: ["**/wiki/**"],
    },
    watch: {
      ignored: ["**/node_modules/**", "**/wiki/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
