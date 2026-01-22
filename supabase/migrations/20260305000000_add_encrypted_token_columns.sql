-- Add encrypted columns for sensitive user data
-- This migration creates new columns without disrupting existing data
-- Migration strategy: Add new columns alongside old ones, migrate data, then drop old columns later

-- Add encrypted reader access token column
ALTER TABLE users
ADD COLUMN reader_access_token_encrypted TEXT;

-- Add encrypted LLM API key column
ALTER TABLE users
ADD COLUMN llm_api_key_encrypted TEXT;

-- Create indexes for encrypted columns (for NULL checks, not searches)
-- These indexes help with queries that check whether a user has configured these tokens
CREATE INDEX idx_users_reader_token_encrypted
ON users (reader_access_token_encrypted)
WHERE reader_access_token_encrypted IS NOT NULL;

CREATE INDEX idx_users_llm_key_encrypted
ON users (llm_api_key_encrypted)
WHERE llm_api_key_encrypted IS NOT NULL;

-- Add migration tracking comments
COMMENT ON COLUMN users.reader_access_token_encrypted IS
  'Encrypted Readwise Reader API token (AES-256-GCM, application-level encryption)';

COMMENT ON COLUMN users.llm_api_key_encrypted IS
  'Encrypted LLM API key for OpenAI/Anthropic/Google (AES-256-GCM, application-level encryption)';

-- Note: Old plaintext columns (reader_access_token, llm_api_key) remain for now
-- They will be dropped in a future migration after data is migrated and verified
