-- Add reading preference columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS skip_amount INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rsvp_font TEXT DEFAULT 'monospace';

-- Add comments for documentation
COMMENT ON COLUMN users.skip_amount IS 'Number of words to skip forward/backward during RSVP reading (1-20)';
COMMENT ON COLUMN users.rsvp_font IS 'Font family for RSVP word display (monospace, ibm-plex-mono, sans-serif, serif)';
