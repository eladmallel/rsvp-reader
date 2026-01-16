-- RSVP Reader Database Schema
-- Migration: 20260116_initial_schema

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reader_access_token TEXT,  -- Encrypted Readwise token
  llm_provider TEXT,         -- 'anthropic', 'openai', 'google'
  llm_api_key TEXT,          -- User's API key (encrypted)
  default_wpm INTEGER DEFAULT 300,
  theme TEXT DEFAULT 'system',
  font_size TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading sessions
CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reader_document_id TEXT NOT NULL,  -- Readwise document ID
  article_title TEXT NOT NULL,
  article_url TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  wpm_start INTEGER NOT NULL,
  wpm_end INTEGER,
  words_read INTEGER DEFAULT 0,
  total_words INTEGER NOT NULL,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  mode TEXT DEFAULT 'rsvp',  -- 'rsvp' or 'traditional'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reader_document_id TEXT NOT NULL,
  article_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached articles (to reduce Reader API calls)
CREATE TABLE cached_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reader_document_id TEXT NOT NULL,
  html_content TEXT,
  plain_text TEXT,
  word_count INTEGER,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reader_document_id)
);

-- Indexes for performance
CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_document ON reading_sessions(reader_document_id);
CREATE INDEX idx_chat_conversations_user_doc ON chat_conversations(user_id, reader_document_id);
CREATE INDEX idx_cached_articles_user_doc ON cached_articles(user_id, reader_document_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_articles ENABLE ROW LEVEL SECURITY;

-- Users: users can only see/edit their own row
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Reading sessions: users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON reading_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat conversations: users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON chat_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages: users can access messages in their conversations
CREATE POLICY "Users can view messages in own conversations" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations WHERE user_id = auth.uid()
    )
  );

-- Cached articles: users can only access their own cached articles
CREATE POLICY "Users can view own cached articles" ON cached_articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cached articles" ON cached_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cached articles" ON cached_articles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cached articles" ON cached_articles
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
