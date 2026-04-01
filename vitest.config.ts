import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "vitest/config";

/** Load `.env` from the repo root so opt-in live tests can use local keys without exporting vars. */
loadEnvFile();

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
