-- Add inbox cursor and improved sort metadata for Readwise sync

ALTER TABLE readwise_sync_state
  ADD COLUMN IF NOT EXISTS inbox_cursor TEXT;

ALTER TABLE cached_documents
  ADD COLUMN IF NOT EXISTS reader_last_moved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reader_saved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cached_documents_reader_updated
  ON cached_documents(user_id, reader_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cached_documents_last_moved
  ON cached_documents(user_id, reader_last_moved_at DESC);
