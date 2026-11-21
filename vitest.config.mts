import { defineConfig } from "vitest/config";

// Unit tests live under src/. Playwright specs under e2e/ run through `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
