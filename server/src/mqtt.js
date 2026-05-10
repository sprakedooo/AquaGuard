import mqtt from 'mqtt';
import { config } from './config.js';
import { logger } from './logger.js';
import { recordTelemetry, recordStatus, recordAck, recordAlertEvent } from './firebase.js';

const PREFIX = config.topicPrefix;

// Topic shape: <prefix>/<deviceId>/<leaf...>
const TOPIC_RE = new RegExp(`^${PREFIX}/([^/]+)/(.+)$`);

let client = null;
const lastAlertByDevice = new Map();

export function getClient() {
  if (!client) throw new Error('MQTT client not initialised');
  return client;
}

export function publishCommand(deviceId, subTopic, payload) {
  const topic = `${PREFIX}/${deviceId}/cmd/${subTopic}`;
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return new Promise((resolve, reject) => {
    client.publish(topic, body, { qos: 1 }, (err) => err ? reject(err) : resolve(topic));
  });
}

async function handleMessage(topic, buf) {
  const m = TOPIC_RE.exec(topic);
  if (!m) return;
  const [, deviceId, leaf] = m;

  let data = null;
  try { data = JSON.parse(buf.toString('utf8')); }
  catch { logger.warn({ topic }, 'Non-JSON payload, ignoring'); return; }

  try {
    if (leaf === 'telemetry') {
      const serverAlert = await recordTelemetry(deviceId, data);

      // Deduplicate alert events by server-computed level (uses all 3 params)
      const prev = lastAlertByDevice.get(deviceId);
      if (prev !== serverAlert) {
        lastAlertByDevice.set(deviceId, serverAlert);
        await recordAlertEvent(deviceId, serverAlert, {
          source: 'telemetry',
          temp:  data.temp  ?? null,
          pH:    data.pH    ?? null,
          turb:  data.turb  ?? null,
          flags: data.flags ?? 0,
        });
      }
    } else if (leaf === 'status') {
      await recordStatus(deviceId, data);
    } else if (leaf === 'ack') {
      await recordAck(deviceId, data);
    } else if (leaf === 'alert') {
      await recordAlertEvent(deviceId, data.level ?? 0, { source: 'device', ...data });
    } else {
      // ignore other leaves (incl. cmd/* — those are bridge → device)
    }
  } catch (err) {
    logger.error({ err, deviceId, leaf }, 'Failed to record uplink');
  }
}

export async function startMqtt() {
  client = mqtt.connect(config.mqtt.url, {
    clientId:        config.mqtt.clientId,
    username:        config.mqtt.username,
    password:        config.mqtt.password,
    reconnectPeriod: 5000,   // was 2000 — slower prevents HiveMQ rate-limit on rapid reconnect
    clean:           true,
    keepalive:       60,     // was 30 — longer heartbeat reduces timeout risk on flaky networks
    connectTimeout:  30000,  // 30 s — allow time for TLS handshake on slow connections
  });

  client.on('connect', () => {
    logger.info({ url: config.mqtt.url }, 'MQTT connected');
    const subs = [
      `${PREFIX}/+/telemetry`,
      `${PREFIX}/+/status`,
      `${PREFIX}/+/alert`,
      `${PREFIX}/+/ack`,
    ];
    client.subscribe(subs, { qos: 1 }, (err, granted) => {
      if (err) logger.error({ err }, 'MQTT subscribe failed');
      else     logger.info({ granted }, 'MQTT subscribed');
    });
  });

  client.on('reconnect', () => logger.warn('MQTT reconnecting'));
  client.on('error',     (err) => logger.error({ err }, 'MQTT error'));
  client.on('close',     () => logger.warn('MQTT connection closed'));
  client.on('message',   handleMessage);

  return new Promise((resolve) => client.once('connect', () => resolve(client)));
}

export async function stopMqtt() {
  if (!client) return;
  await new Promise((res) => client.end(false, {}, res));
  client = null;
}
