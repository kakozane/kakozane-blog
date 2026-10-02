import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 6325,
    strictPort: true,
    allowedHosts: ["dev.kakozane.icu"],
    proxy: { "/api": "http://localhost:6324" },
  },
});
