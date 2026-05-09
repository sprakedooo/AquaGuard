import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  mqtt: {
    url:      process.env.MQTT_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId: process.env.MQTT_CLIENT_ID || `aquaguard-bridge-${Math.random().toString(16).slice(2, 8)}`,
  },
  topicPrefix: process.env.TOPIC_PREFIX || 'aquaguard',
  firebase: {
    databaseURL: required('FIREBASE_DATABASE_URL'),
    // GOOGLE_APPLICATION_CREDENTIALS is read by firebase-admin automatically
  },
  retentionDays: Number(process.env.READING_RETENTION_DAYS ?? 30),
  healthPort:    Number(process.env.HEALTH_PORT ?? 8080),
  logLevel:      process.env.LOG_LEVEL || 'info',
};
