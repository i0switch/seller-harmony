import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { chromium } from '@playwright/test';

const baseURL =
    process.env.HOSTED_BASE_URL ??
    'https://preview--member-bridge-flow.lovable.app';
const storageStatePath =
    process.env.HOSTED_STORAGE_STATE ??
    '.auth/lovable-hosted-state.json';
const userDataDir =
    process.env.HOSTED_USER_DATA_DIR ??
    '.auth/lovable-user-data';

async function launchContext() {
    const profilePath = path.resolve(userDataDir);
    await fs.mkdir(profilePath, { recursive: true });

    try {
        return await chromium.launchPersistentContext(profilePath, {
            channel: 'chrome',
            headless: false,
            viewport: null,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
            ],
        });
    } catch (error) {
        console.warn('Chrome channel launch failed. Falling back to bundled Chromium.');
        console.warn(String(error));
        return chromium.launchPersistentContext(profilePath, {
            headless: false,
            viewport: null,
            args: ['--start-maximized'],
        });
    }
}

async function main() {
    const outputPath = path.resolve(storageStatePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const context = await launchContext();
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    await rl.question(
        'Lovable側でログイン完了後に Enter を押してください（保存先: ' +
            storageStatePath +
            '）: ',
    );
    rl.close();

    await context.storageState({ path: outputPath });
    await context.close();

    console.log('Saved hosted storage state:', storageStatePath);
}

main().catch((error) => {
    console.error('Failed to capture hosted storage state.');
    console.error(error);
    process.exit(1);
});
