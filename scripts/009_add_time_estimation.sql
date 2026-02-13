-- Migration: Add time estimation fields
-- Description: Adds support for time estimation alongside story points

-- Add time estimation fields to stories table
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS time_estimate_hours FLOAT,
ADD COLUMN IF NOT EXISTS time_estimate_minutes INTEGER;

-- Add time estimation toggle to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS time_estimation_enabled BOOLEAN DEFAULT true;

-- Create time_votes table to store time estimation votes
CREATE TABLE IF NOT EXISTS time_votes (
    id SERIAL PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    vote_hours FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_code, participant_name)
);

-- Add time estimation to vote history
ALTER TABLE vote_history
ADD COLUMN IF NOT EXISTS time_vote_hours FLOAT,
ADD COLUMN IF NOT EXISTS final_time_estimate_hours FLOAT;

-- Create index for time_votes
CREATE INDEX IF NOT EXISTS idx_time_votes_room ON time_votes(room_code);
CREATE INDEX IF NOT EXISTS idx_time_votes_participant ON time_votes(room_code, participant_name);

-- Enable RLS (Row Level Security) for time_votes
ALTER TABLE time_votes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for time_votes (same as votes table)
CREATE POLICY "Enable all operations for time_votes" ON time_votes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comment on new columns
COMMENT ON COLUMN stories.time_estimate_hours IS 'Final time estimate in hours (consensus from team voting)';
COMMENT ON COLUMN stories.time_estimate_minutes IS 'Additional minutes for time estimate (0-59)';
COMMENT ON COLUMN rooms.time_estimation_enabled IS 'Enable time estimation in addition to story points';
COMMENT ON TABLE time_votes IS 'Stores individual time estimation votes from participants';
