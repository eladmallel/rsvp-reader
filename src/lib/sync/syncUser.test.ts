import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPageSize } from './syncUser';

describe('getPageSize', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default page size of 100 when env var is not set', () => {
    delete process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE;
    expect(getPageSize()).toBe(100);
  });

  it('returns custom page size when env var is set to valid number', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '10';
    expect(getPageSize()).toBe(10);
  });

  it('returns custom page size for larger values', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '50';
    expect(getPageSize()).toBe(50);
  });

  it('returns default when env var is set to zero', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '0';
    expect(getPageSize()).toBe(100);
  });

  it('returns default when env var is set to negative number', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '-5';
    expect(getPageSize()).toBe(100);
  });

  it('returns default when env var is set to non-numeric string', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = 'abc';
    expect(getPageSize()).toBe(100);
  });

  it('returns default when env var is set to empty string', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '';
    expect(getPageSize()).toBe(100);
  });

  it('returns default when env var is set to float (parses as int)', () => {
    process.env.READWISE_SYNC_PAGE_SIZE_OVERRIDE = '10.5';
    expect(getPageSize()).toBe(10);
  });
});
