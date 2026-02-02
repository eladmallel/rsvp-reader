-- Add first_opened_at and last_opened_at columns to cached_documents
-- These are needed to properly classify Feed items as seen/unseen
-- Readwise uses first_opened_at (not reading_progress) to track if user has "seen" a document

ALTER TABLE cached_documents
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;

-- Index for efficient Feed seen/unseen queries
CREATE INDEX IF NOT EXISTS idx_cached_documents_first_opened
ON cached_documents(user_id, location, first_opened_at);
