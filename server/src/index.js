import http from 'node:http';
import { config } from './config.js';
import { logger } from './logger.js';
import { startMqtt, stopMqtt, getClient } from './mqtt.js';
import { startCommandRelay } from './commands.js';
import { pruneOldReadings } from './firebase.js';

let stopRelay = null;
let healthSrv = null;
let pruneTimer = null;

async function main() {
  logger.info('AquaGuard bridge starting');

  await startMqtt();
  stopRelay = startCommandRelay();

  if (config.retentionDays > 0) {
    pruneTimer = setInterval(() => {
      pruneOldReadings(config.retentionDays).catch((err) => logger.error({ err }, 'Prune failed'));
    }, 6 * 60 * 60 * 1000);   // every 6h
    pruneOldReadings(config.retentionDays).catch((err) => logger.error({ err }, 'Initial prune failed'));
  }

  healthSrv = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      const ok = getClient()?.connected;
      res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok, mqtt: !!ok, ts: Date.now() }));
      return;
    }
    res.writeHead(404); res.end();
  });
  healthSrv.listen(config.healthPort, () => {
    logger.info({ port: config.healthPort }, 'Health endpoint listening');
  });
}

async function shutdown(signal) {
  logger.warn({ signal }, 'Shutting down');
  if (pruneTimer) clearInterval(pruneTimer);
  try { stopRelay?.(); } catch {}
  try { healthSrv?.close(); } catch {}
  try { await stopMqtt(); } catch {}
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
process.on('uncaughtException',  (err) => { logger.fatal({ err }, 'uncaughtException'); process.exit(1); });

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error');
  process.exit(1);
});
