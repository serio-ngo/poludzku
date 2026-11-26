import { defineConfig, devices } from "@playwright/test";

// The production build served by `astro preview`, against the synthetic upstream (.dev.vars from the example).
export default defineConfig({
    testDir: "tests/e2e",
    fullyParallel: false,
    workers: 1,
    reporter: [["list"]],
    use: { baseURL: "http://localhost:4321", ...devices["Desktop Chrome"] },
    webServer: {
        command: "npm run build && npm run preview",
        url: "http://localhost:4321/",
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
    },
});
