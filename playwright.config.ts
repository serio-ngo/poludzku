import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "e2e",
    projects: [
        { name: "dev", testIgnore: /preview\.spec\.ts/, use: { baseURL: "http://localhost:4321" } },
        { name: "preview", testMatch: /preview\.spec\.ts/, use: { baseURL: "http://localhost:4322" } },
    ],
    webServer: [
        {
            command: "npx astro dev --port 4321 --ignore-lock",
            url: "http://localhost:4321/terms",
            env: { CLOUDFLARE_INCLUDE_PROCESS_ENV: "true", GITHUB_UPSTREAM: "synthetic" },
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            command: "npx astro preview --port 4322 --ignore-lock",
            url: "http://localhost:4322/terms",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
});
