import { describe, expect, it } from 'vitest';

import {
  parseConfigChangeEventPayload,
  compareStoredConfigRecords,
} from '../../src/live-config/live-config.guards.ts';

describe('live-config guards', () => {
  it('accepts well-formed change events', () => {
    expect(
      parseConfigChangeEventPayload({
        key: 'demo.key',
        version: '123',
        updatedAt: '2026-03-19T12:00:00.000Z',
      }),
    ).toEqual({
      key: 'demo.key',
      version: '123',
      updatedAt: '2026-03-19T12:00:00.000Z',
    });
  });

  it('rejects malformed change events', () => {
    expect(
      parseConfigChangeEventPayload({
        key: 'demo.key',
        version: '123',
        updatedAt: 'not-a-date',
      }),
    ).toBeUndefined();

    expect(
      parseConfigChangeEventPayload({
        key: '',
        version: '123',
        updatedAt: '2026-03-19T12:00:00.000Z',
      }),
    ).toBeUndefined();

    expect(
      parseConfigChangeEventPayload({
        key: 'demo.key',
        version: 123,
        updatedAt: '2026-03-19T12:00:00.000Z',
      }),
    ).toBeUndefined();
  });

  it('orders records by freshness before version tie-breaks', () => {
    expect(
      compareStoredConfigRecords(
        {
          key: 'demo.key',
          payload: 'older',
          version: '1',
          updatedAt: '2026-03-19T12:00:00.000Z',
        },
        {
          key: 'demo.key',
          payload: 'newer',
          version: '2',
          updatedAt: '2026-03-19T12:01:00.000Z',
        },
      ),
    ).toBeLessThan(0);

    expect(
      compareStoredConfigRecords(
        {
          key: 'demo.key',
          payload: 'older',
          version: '1',
          updatedAt: '2026-03-19T12:01:00.000Z',
        },
        {
          key: 'demo.key',
          payload: 'newer',
          version: '2',
          updatedAt: '2026-03-19T12:01:00.000Z',
        },
      ),
    ).toBeLessThan(0);
  });
});
