import { describe, expect, it } from 'vitest';

import { PostgresSyncAdapter } from '../../src/postgres-sync.adapter.ts';

describe('PostgresSyncAdapter', () => {
  it('rejects unsafe LISTEN channel names', () => {
    expect(
      () =>
        new PostgresSyncAdapter({
          connectionString:
            'postgres://postgres:postgres@localhost:5432/live_config',
          channel: 'unsafe-channel; drop table users',
        }),
    ).toThrow(/channel names must match/);
  });
});
