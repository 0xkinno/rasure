import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/live",
  timeout: 420_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", browserName: "chromium", headless: true },
});
