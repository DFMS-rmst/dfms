import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const candidatePythons = [
  path.join(rootDir, 'ml-service', '.venv', 'Scripts', 'python.exe'),
  path.join(rootDir, 'ml-service', 'venv', 'Scripts', 'python.exe'),
  path.join(rootDir, 'ml-service', '.venv', 'bin', 'python'),
  path.join(rootDir, 'ml-service', 'venv', 'bin', 'python'),
  'python',
];

const selectedPython =
  candidatePythons.find((p) => {
    if (p === 'python') return true;
    return fs.existsSync(p);
  }) || 'python';

console.log(`Starting Animal Risk ML Microservice using: ${selectedPython}`);

const child = spawn(
  selectedPython,
  [
    '-m',
    'uvicorn',
    'main:app',
    '--app-dir',
    'ml-service',
    '--reload-dir',
    'ml-service',
    '--host',
    '0.0.0.0',
    '--port',
    '8000',
    '--reload',
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  },
);

child.on('error', (err) => {
  console.error('Failed to start ML microservice:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
