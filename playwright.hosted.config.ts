import { defineConfig, devices } from '@playwright/test';

const hostedBaseURL =
    process.env.HOSTED_BASE_URL ??
    'https://preview--member-bridge-flow.lovable.app';

const hostedStorageState =
    process.env.HOSTED_STORAGE_STATE ??
    '.auth/lovable-hosted-state.json';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: hostedBaseURL,
        storageState: hostedStorageState,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
