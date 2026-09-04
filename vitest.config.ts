import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@semantic-director/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@semantic-director/scene-core": path.resolve(__dirname, "packages/scene-core/src/index.ts"),
      "@semantic-director/camera-dsl": path.resolve(__dirname, "packages/camera-dsl/src/index.ts"),
      "@semantic-director/camera-solver": path.resolve(
        __dirname,
        "packages/camera-solver/src/index.ts",
      ),
      "@semantic-director/project-core": path.resolve(__dirname, "packages/project-core/src/index.ts"),
      "@semantic-director/dsl-core": path.resolve(__dirname, "packages/dsl-core/src/index.ts"),
      "@semantic-director/dsl-runtime": path.resolve(__dirname, "packages/dsl-runtime/src/index.ts"),
    },
  },
});
