import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import importMapper from "@importmapper/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/unbundled/",
  build: {
    outDir: "dist/unbundled",
  },
  plugins: [react(), importMapper({ preloadModules: ["react", "react-dom"] })],
});
