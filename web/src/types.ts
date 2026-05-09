export type AlertLevel = 0 | 1 | 2;

export interface Reading {
  serverTs: number;
  deviceTs?: number | null;
  seq?: number | null;
  temp: number | null;
  pH: number | null;
  turb: number | null;
  alert: AlertLevel;
  flags: number;
  pH_mv?: number | null;
  turb_mv?: number | null;
  rssi?: number | null;
  snr?: number | null;
}

export interface DeviceMeta {
  online?: boolean;
  fw?: string | null;
  uptime?: number | null;
  uplinks?: number | null;
  lastRssi?: number | null;
  lastSnr?: number | null;
  wifiRssi?: number | null;
  ip?: string | null;
  statusTs?: number;
  lastSeen?: number;
  lastAlert?: AlertLevel;
}

export interface AlertEvent {
  level: AlertLevel;
  serverTs: number;
  source?: string;
  temp?: number | null;
  pH?: number | null;
  turb?: number | null;
  flags?: number;
}

export interface VarThresh {
  warnLow:  number;
  warnHigh: number;
  critLow:  number;
  critHigh: number;
}

export interface Thresholds {
  temp: VarThresh;
  ph:   VarThresh;
  turb: VarThresh;   // *Low ignored on device side
}

export type CommandType = 'cal/ph' | 'cal/turb' | 'cal/temp' | 'threshold' | 'reboot';

export interface CommandRecord {
  type: CommandType;
  payload: Record<string, unknown>;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  createdAt?: number;
  sentAt?: number;
  finishedAt?: number;
  error?: string;
  topic?: string;
}
