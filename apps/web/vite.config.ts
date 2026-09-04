import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        preview: path.resolve(__dirname, "preview.html"),
        bench: path.resolve(__dirname, "bench.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@semantic-director/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@semantic-director/scene-core": path.resolve(__dirname, "../../packages/scene-core/src/index.ts"),
      "@semantic-director/camera-dsl": path.resolve(__dirname, "../../packages/camera-dsl/src/index.ts"),
      "@semantic-director/camera-solver": path.resolve(
        __dirname,
        "../../packages/camera-solver/src/index.ts",
      ),
      "@semantic-director/project-core": path.resolve(__dirname, "../../packages/project-core/src/index.ts"),
      "@semantic-director/renderer-three": path.resolve(
        __dirname,
        "../../packages/renderer-three/src/index.ts",
      ),
      "@semantic-director/dsl-core": path.resolve(__dirname, "../../packages/dsl-core/src/index.ts"),
      "@semantic-director/dsl-runtime": path.resolve(__dirname, "../../packages/dsl-runtime/src/index.ts"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/deepseek": {
        target: "https://api.deepseek.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deepseek/, ""),
      },
    },
  },
});
