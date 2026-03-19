import { randomUUID } from 'node:crypto';

import type {
  LiveConfigDefaultOptions,
  LiveConfigDefinition,
  LiveConfigReadOptions,
  ResolvedLiveConfigReadOptions,
  StoredConfigRecord,
} from './types.ts';

const DEFAULT_READ_OPTIONS: ResolvedLiveConfigReadOptions = {
  forceRefresh: false,
  preferPubSub: true,
};

export function defineConfig<T>(
  definition: LiveConfigDefinition<T>,
): LiveConfigDefinition<T> {
  return definition;
}

export function resolveDefaultValue<T>(definition: LiveConfigDefinition<T>): T {
  if (typeof definition.defaultValue === 'function') {
    return (definition.defaultValue as () => T)();
  }

  return cloneValue(definition.defaultValue);
}

export function serializeValue<T>(
  definition: LiveConfigDefinition<T>,
  value: T,
): unknown {
  if (definition.serialize !== undefined) {
    return definition.serialize(value);
  }

  return cloneValue(value);
}

export function deserializeValue<T>(
  definition: LiveConfigDefinition<T>,
  payload: unknown,
): T {
  const value =
    definition.deserialize !== undefined
      ? definition.deserialize(payload)
      : (cloneValue(payload) as T);

  if (definition.validate !== undefined) {
    definition.validate(value);
  }

  return value;
}

export function validateValue<T>(
  definition: LiveConfigDefinition<T>,
  value: T,
): void {
  definition.validate?.(value);
}

export function createStoredRecord<T>(
  definition: LiveConfigDefinition<T>,
  value: T,
): StoredConfigRecord {
  const now = new Date().toISOString();

  return {
    key: definition.key,
    payload: serializeValue(definition, value),
    version: `${Date.now()}-${randomUUID()}`,
    updatedAt: now,
  };
}

export function mergeReadOptions(
  defaults?: LiveConfigDefaultOptions,
  overrides?: LiveConfigReadOptions,
): ResolvedLiveConfigReadOptions {
  return {
    ...DEFAULT_READ_OPTIONS,
    staleTtlMs: overrides?.staleTtlMs ?? defaults?.staleTtlMs,
    watchIntervalMs: overrides?.watchIntervalMs ?? defaults?.watchIntervalMs,
    preferPubSub: overrides?.preferPubSub ?? defaults?.preferPubSub ?? true,
    forceRefresh:
      overrides?.forceRefresh ?? defaults?.forceRefreshOnRead ?? false,
  };
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return structuredClone(value);
}
