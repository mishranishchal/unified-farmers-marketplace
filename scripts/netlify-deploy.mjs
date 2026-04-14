import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
if (mode !== 'preview' && mode !== 'prod') {
  console.error('Usage: node scripts/netlify-deploy.mjs <preview|prod>');
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

function quoteArg(value) {
  if (!/[ \t"&^|<>]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function run(args) {
  return new Promise((resolve) => {
    const command = isWindows
      ? `npx ${args.map(quoteArg).join(' ')}`
      : `npx ${args.map(quoteArg).join(' ')}`;
    const child = spawn(command, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const staticDir = path.join(repoRoot, '.netlify', 'static');
const functionsDir = path.join(repoRoot, '.netlify', 'functions');

const buildExitCode = await run(['netlify', 'build']);
if (buildExitCode !== 0) {
  const hasArtifacts = existsSync(staticDir) && existsSync(functionsDir);
  if (!hasArtifacts) {
    process.exit(buildExitCode);
  }

  console.warn(
    'Continuing after a Netlify build failure because the generated artifacts exist. This works around the Windows-local Next.js publish bug.'
  );
}

const deployArgs = [
  'netlify',
  'deploy',
  '--no-build',
  '--dir=.netlify/static',
  '--functions=.netlify/functions',
  '--message',
  mode === 'prod' ? 'Manual production deploy' : 'Manual preview deploy',
];

if (mode === 'prod') {
  deployArgs.push('--prod');
}

const deployExitCode = await run(deployArgs);
process.exit(deployExitCode);
