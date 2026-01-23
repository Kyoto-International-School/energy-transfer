import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/energy-transfer/",
  plugins: [react()],
  server: {
    fs: {
      deny: ["**/wiki/**"],
    },
    watch: {
      ignored: ["**/node_modules/**", "**/wiki/**"],
    },
  },
});
