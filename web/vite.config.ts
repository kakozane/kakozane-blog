import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 6325,
    strictPort: true,
    allowedHosts: ["dev.retniw.cc"],
    proxy: { "/api": "http://localhost:6324" },
  },
});
