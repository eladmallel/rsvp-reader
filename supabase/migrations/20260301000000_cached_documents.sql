-- Cached documents table for Readwise document metadata
-- This stores document metadata from Readwise so we can display the library
-- without making API calls to Readwise

CREATE TABLE cached_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reader_document_id TEXT NOT NULL,
  title TEXT,
  author TEXT,
  source TEXT,
  site_name TEXT,
  url TEXT NOT NULL,
  source_url TEXT,
  category TEXT NOT NULL,
  location TEXT,
  tags JSONB DEFAULT '{}',
  word_count INTEGER,
  reading_progress DECIMAL(5,2) DEFAULT 0,
  summary TEXT,
  image_url TEXT,
  published_date TIMESTAMPTZ,
  reader_created_at TIMESTAMPTZ,
  reader_updated_at TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reader_document_id)
);

-- Indexes for performance
CREATE INDEX idx_cached_documents_user_id ON cached_documents(user_id);
CREATE INDEX idx_cached_documents_user_location ON cached_documents(user_id, location);
CREATE INDEX idx_cached_documents_user_category ON cached_documents(user_id, category);
CREATE INDEX idx_cached_documents_reader_created ON cached_documents(user_id, reader_created_at DESC);
CREATE INDEX idx_cached_documents_tags ON cached_documents USING GIN (tags);

-- Row Level Security
ALTER TABLE cached_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own cached documents" ON cached_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cached documents" ON cached_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached documents" ON cached_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached documents" ON cached_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: Add reader_updated_at column to cached_articles if it doesn't exist
-- (It was added previously but let's ensure it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cached_articles' AND column_name = 'reader_updated_at'
  ) THEN
    ALTER TABLE cached_articles ADD COLUMN reader_updated_at TIMESTAMPTZ;
  END IF;
END $$;
