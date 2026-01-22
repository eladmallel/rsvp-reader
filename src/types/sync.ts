/**
 * TypeScript types for Readwise sync API
 */

export interface SyncStatus {
  inProgress: boolean;
  lastSyncAt: string | null;
  nextAllowedAt: string | null;
}

export interface SyncTriggerResponse {
  success: true;
  jobId: string;
}

export interface SyncErrorResponse {
  error: string;
  nextAllowedAt?: string;
  waitSeconds?: number;
}
