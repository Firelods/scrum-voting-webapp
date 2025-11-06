-- Add vote history tracking and final estimates
-- This allows keeping a record of all votes for each story

-- Create vote_history table to store historical votes
CREATE TABLE IF NOT EXISTS scrum_poker.vote_history (
  id SERIAL PRIMARY KEY,
  room_code TEXT NOT NULL,
  story_id INTEGER NOT NULL REFERENCES scrum_poker.stories(id) ON DELETE CASCADE,
  story_title TEXT NOT NULL, -- Denormalized for easier querying
  participant_name TEXT NOT NULL,
  vote_value INTEGER NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add final_estimate field to stories table
ALTER TABLE scrum_poker.stories
ADD COLUMN IF NOT EXISTS final_estimate INTEGER;

-- Add voted_at field to stories to track when voting was completed
ALTER TABLE scrum_poker.stories
ADD COLUMN IF NOT EXISTS voted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vote_history_room ON scrum_poker.vote_history(room_code);
CREATE INDEX IF NOT EXISTS idx_vote_history_story ON scrum_poker.vote_history(story_id);
CREATE INDEX IF NOT EXISTS idx_vote_history_room_revealed ON scrum_poker.vote_history(room_code, revealed_at DESC);

-- Enable Realtime for vote_history table
ALTER PUBLICATION supabase_realtime
ADD TABLE scrum_poker.vote_history;

-- Grant necessary permissions (adjust based on your RLS policies)
GRANT ALL ON scrum_poker.vote_history TO authenticated;
GRANT ALL ON scrum_poker.vote_history TO anon;
