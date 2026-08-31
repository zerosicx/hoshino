import path from "node:path";
import { defineConfig } from "vitest/config";

const root = process.cwd();

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "scripts/**"],
    // The ranking benchmark opens a 98MB database and runs ~45 FTS queries.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": root,
      "@components": path.join(root, "components"),
      "@services": path.join(root, "services"),
      "@hooks": path.join(root, "hooks"),
      "@stores": path.join(root, "stores"),
      "@utils": path.join(root, "utils"),
      "@assets": path.join(root, "assets"),
    },
  },
});
