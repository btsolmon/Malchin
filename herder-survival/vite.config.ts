import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: ".",
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    fs: { allow: [path.resolve(__dirname, "..")] },
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "../lib"),
    },
  },
});
