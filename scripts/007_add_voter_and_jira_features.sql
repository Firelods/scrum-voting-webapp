-- Add is_voter field to participants table
ALTER TABLE scrum_poker.participants
ADD COLUMN IF NOT EXISTS is_voter BOOLEAN DEFAULT TRUE;

-- Add jira_base_url to rooms table for configurable Jira links
ALTER TABLE scrum_poker.rooms
ADD COLUMN IF NOT EXISTS jira_base_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN scrum_poker.participants.is_voter IS 'Indicates if the participant can vote (some users may be observers only)';
COMMENT ON COLUMN scrum_poker.rooms.jira_base_url IS 'Base URL for Jira links (e.g., https://jira.example.com/browse/PROJECT-)';
