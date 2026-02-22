import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "../shared/tests/**/*.test.ts"],
  },
});
