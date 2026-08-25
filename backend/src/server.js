import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () =>
  console.log(`Backend listening on port ${env.PORT}`),
);
function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close((error) => process.exit(error ? 1 : 0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
