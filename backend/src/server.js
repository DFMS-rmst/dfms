import { createApp } from './app.js';
import { env } from './config/env.js';
import { startDailyEvaluationScheduler } from './modules/daily-clearance/scheduler.js';

const app = createApp();
const server = app.listen(env.PORT, '0.0.0.0', () =>
  console.log(`Backend listening on port ${env.PORT}`),
);
const stopScheduler = env.NODE_ENV === 'test' ? () => {} : startDailyEvaluationScheduler();
function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  stopScheduler();
  server.close((error) => process.exit(error ? 1 : 0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
