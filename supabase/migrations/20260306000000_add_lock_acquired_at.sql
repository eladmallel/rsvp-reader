-- Add lock_acquired_at column to track when sync lock was acquired
-- This allows detecting and recovering from stale locks

ALTER TABLE readwise_sync_state
  ADD COLUMN lock_acquired_at TIMESTAMPTZ;

-- Backfill: for any currently in_progress rows, set lock_acquired_at to now
-- This ensures existing stale locks can be detected
UPDATE readwise_sync_state
SET lock_acquired_at = NOW()
WHERE in_progress = TRUE;
