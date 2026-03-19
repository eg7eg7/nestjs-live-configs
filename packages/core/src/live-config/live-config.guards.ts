import type { ConfigChangeEvent, StoredConfigRecord } from './types.ts';

export const MAX_CONFIG_KEY_LENGTH = 256;
export const MAX_CONFIG_EVENT_FIELD_LENGTH = 256;
export const MIN_WATCH_INTERVAL_MS = 100;
export const MAX_WATCH_INTERVAL_MS = 60_000;
export const MIN_STALE_TTL_MS = 0;
export const MAX_STALE_TTL_MS = 86_400_000;

export function isKnownConfigKey(key: string): boolean {
  return key.length > 0 && key.length <= MAX_CONFIG_KEY_LENGTH;
}

export function clampWatchIntervalMs(value: number): number {
  return clampNumber(value, MIN_WATCH_INTERVAL_MS, MAX_WATCH_INTERVAL_MS);
}

export function clampStaleTtlMs(value: number): number {
  return clampNumber(value, MIN_STALE_TTL_MS, MAX_STALE_TTL_MS);
}

export function parseConfigChangeEventPayload(
  payload: unknown,
): ConfigChangeEvent | undefined {
  if (!isObject(payload)) {
    return undefined;
  }

  const key = readBoundedString(payload.key, MAX_CONFIG_KEY_LENGTH);
  const version = readBoundedString(
    payload.version,
    MAX_CONFIG_EVENT_FIELD_LENGTH,
  );
  const updatedAt = readBoundedString(
    payload.updatedAt,
    MAX_CONFIG_EVENT_FIELD_LENGTH,
  );

  if (
    key === undefined ||
    version === undefined ||
    updatedAt === undefined ||
    Number.isNaN(Date.parse(updatedAt))
  ) {
    return undefined;
  }

  return {
    key,
    version,
    updatedAt,
  };
}

export function compareStoredConfigRecords(
  left: StoredConfigRecord,
  right: StoredConfigRecord,
): number {
  const updatedAtDiff =
    Date.parse(left.updatedAt) - Date.parse(right.updatedAt);

  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.version.localeCompare(right.version);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBoundedString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed;
}
