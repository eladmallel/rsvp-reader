-- Add Readwise sync state and cache metadata

ALTER TABLE cached_articles
  ADD COLUMN reader_updated_at TIMESTAMPTZ;

CREATE TABLE readwise_sync_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  library_cursor TEXT,
  feed_cursor TEXT,
  next_allowed_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  in_progress BOOLEAN DEFAULT FALSE,
  initial_backfill_done BOOLEAN DEFAULT FALSE,
  window_started_at TIMESTAMPTZ,
  window_request_count INTEGER DEFAULT 0,
  last_429_at TIMESTAMPTZ
);

CREATE INDEX idx_readwise_sync_state_next_allowed_at ON readwise_sync_state(next_allowed_at);

ALTER TABLE readwise_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync state" ON readwise_sync_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sync state" ON readwise_sync_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync state" ON readwise_sync_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync state" ON readwise_sync_state
  FOR DELETE USING (auth.uid() = user_id);
