import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
    const args = { repeat: 1, dryRun: false, withAuthCapture: false };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--dry-run') {
            args.dryRun = true;
            continue;
        }
        if (token === '--with-auth-capture') {
            args.withAuthCapture = true;
            continue;
        }
        if (token === '--repeat') {
            const raw = argv[index + 1];
            const parsed = Number.parseInt(raw ?? '1', 10);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.repeat = parsed;
            }
            index += 1;
            continue;
        }
    }

    return args;
}

function timestampForFile(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function runCommand({ command, cwd, logFile, env = {} }) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd,
            shell: true,
            env: { ...process.env, ...env },
            stdio: ['inherit', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (chunk) => {
            process.stdout.write(chunk);
            void fs.appendFile(logFile, chunk);
        });

        child.stderr.on('data', (chunk) => {
            process.stderr.write(chunk);
            void fs.appendFile(logFile, chunk);
        });

        child.on('error', (error) => reject(error));
        child.on('close', (code) => resolve(code ?? 1));
    });
}

async function main() {
    const { repeat, dryRun, withAuthCapture } = parseArgs(process.argv.slice(2));
    const workspaceRoot = process.cwd();
    const logsDir = path.join(workspaceRoot, '.qa-automation', 'logs');
    await fs.mkdir(logsDir, { recursive: true });

    const runStamp = timestampForFile();
    const logFile = path.join(logsDir, `vscode-auto-${runStamp}.log`);

    const steps = [
        { name: 'List hosted tests', command: 'npx playwright test -c playwright.hosted.config.ts --list' },
    ];

    if (withAuthCapture) {
        steps.push({ name: 'Capture hosted auth storage', command: 'npm run e2e:hosted:auth' });
    }

    const unauthStatePath = path.join(workspaceRoot, '.auth', 'lovable-empty-state.json');
    await fs.mkdir(path.dirname(unauthStatePath), { recursive: true });
    await fs.writeFile(
        unauthStatePath,
        JSON.stringify({ cookies: [], origins: [] }, null, 2),
        'utf8',
    );

    for (let index = 0; index < repeat; index += 1) {
        steps.push({
            name: `Run hosted e2e (${index + 1}/${repeat})`,
            command: 'npm run e2e:hosted',
            env: withAuthCapture
                ? {}
                : {
                      HOSTED_STORAGE_STATE: unauthStatePath,
                  },
            dnsRetryLimit: 1,
        });
    }

    const header = [
        `# VSCode Hosted Auto Run`,
        `started_at=${new Date().toISOString()}`,
        `repeat=${repeat}`,
        `dry_run=${dryRun}`,
        `with_auth_capture=${withAuthCapture}`,
        '',
    ].join('\n');

    await fs.writeFile(logFile, header, 'utf8');

    console.log(`Automation log: ${path.relative(workspaceRoot, logFile)}`);

    if (dryRun) {
        console.log('Dry run mode. Planned steps:');
        steps.forEach((step, index) => {
            console.log(`${index + 1}. ${step.name} -> ${step.command}`);
        });
        return;
    }

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        const title = `\n[${index + 1}/${steps.length}] ${step.name}`;
        console.log(title);
        await fs.appendFile(logFile, `${title}\n$ ${step.command}\n`, 'utf8');

        let code = await runCommand({
            command: step.command,
            cwd: workspaceRoot,
            logFile,
            env: step.env,
        });

        if (code !== 0 && step.dnsRetryLimit) {
            const currentLog = await fs.readFile(logFile, 'utf8');
            const hasDnsError = currentLog.includes('ERR_NAME_NOT_RESOLVED');
            if (hasDnsError) {
                const retryTitle = `${title} [DNS retry 1/${step.dnsRetryLimit}]`;
                console.log(retryTitle);
                await fs.appendFile(logFile, `${retryTitle}\n`, 'utf8');
                code = await runCommand({
                    command: step.command,
                    cwd: workspaceRoot,
                    logFile,
                    env: step.env,
                });
            }
        }

        await fs.appendFile(logFile, `exit_code=${code}\n\n`, 'utf8');
        if (code !== 0) {
            console.error(`Stopped at step: ${step.name}`);
            console.error(`See log: ${path.relative(workspaceRoot, logFile)}`);
            process.exit(code);
        }
    }

    console.log('\nAll steps completed successfully.');
    console.log(`Log saved: ${path.relative(workspaceRoot, logFile)}`);
}

main().catch((error) => {
    console.error('Automation failed with unexpected error.');
    console.error(error);
    process.exit(1);
});
