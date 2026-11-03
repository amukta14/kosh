import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/empty-module.ts") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { SESSION_SECRET: "test-secret-test-secret-test-secret-00", GATEWAY_WEBHOOK_SECRET: "gw-secret-gw-secret-gw-secret-gw-secret", APP_URL: "https://kosh.test" },
  },
});
