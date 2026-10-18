import { defineConfig } from "@playwright/test";

const devices = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-15-pro", width: 393, height: 852 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "ipad-mini", width: 768, height: 1024 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", browserName: "chromium" },
  projects: devices.map((d) => ({ name: d.name, use: { viewport: { width: d.width, height: d.height } } })),
});
