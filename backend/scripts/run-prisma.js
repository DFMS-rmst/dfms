import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const prismaEntry = path.resolve(__dirname, '../node_modules/prisma/build/index.js');
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const args = process.argv.slice(2);
if (!args.some((arg) => arg.startsWith('--schema'))) {
  args.push(`--schema=${schemaPath}`);
}

const result = spawnSync(process.execPath, [prismaEntry, ...args], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
