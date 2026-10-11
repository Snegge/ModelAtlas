import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4200",
    browserName: "chromium",
    launchOptions: process.env["CHROMIUM_PATH"]
      ? { executablePath: process.env["CHROMIUM_PATH"] }
      : {},
  },
  reporter: [["list"]],
  timeout: 45000,
});
