import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,           // 60s per test
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,   // 1 automatic retry locally
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { open: 'never' }],
        ['list'],              // Rich list output in terminal
    ],
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',   // Capture trace on retry for debugging
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,   // Time for a single action (click, fill, etc.)
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
