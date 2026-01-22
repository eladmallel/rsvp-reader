-- Add archive and shortlist cursors to sync state for complete location coverage

ALTER TABLE readwise_sync_state
  ADD COLUMN IF NOT EXISTS archive_cursor TEXT,
  ADD COLUMN IF NOT EXISTS shortlist_cursor TEXT;
