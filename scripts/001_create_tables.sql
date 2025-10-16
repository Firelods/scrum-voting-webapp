-- Create custom schema for Scrum voting app (not using public schema)
CREATE SCHEMA IF NOT EXISTS scrum_poker;
-- Set search path to custom schema
SET search_path TO scrum_poker;
-- Enable Realtime for this schema
ALTER PUBLICATION supabase_realtime
ADD TABLE scrum_poker.rooms;
ALTER PUBLICATION supabase_realtime
ADD TABLE scrum_poker.participants;
ALTER PUBLICATION supabase_realtime
ADD TABLE scrum_poker.votes;
ALTER PUBLICATION supabase_realtime
ADD TABLE scrum_poker.stories;
-- Rooms table
CREATE TABLE IF NOT EXISTS scrum_poker.rooms (
  code TEXT PRIMARY KEY,
  scrum_master_name TEXT NOT NULL,
  current_story_index INTEGER DEFAULT 0,
  voting_state TEXT DEFAULT 'idle' CHECK (voting_state IN ('idle', 'voting', 'revealed')),
  votes_revealed BOOLEAN DEFAULT FALSE,
  timer_duration INTEGER,
  timer_end_time BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Participants table
CREATE TABLE IF NOT EXISTS scrum_poker.participants (
  id SERIAL PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES scrum_poker.rooms(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_scrum_master BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, name)
);
-- Votes table
CREATE TABLE IF NOT EXISTS scrum_poker.votes (
  id SERIAL PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES scrum_poker.rooms(code) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  vote_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, participant_name)
);
-- Stories table
CREATE TABLE IF NOT EXISTS scrum_poker.stories (
  id SERIAL PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES scrum_poker.rooms(code) ON DELETE CASCADE,
  title TEXT NOT NULL,
  jira_link TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_room ON scrum_poker.participants(room_code);
CREATE INDEX IF NOT EXISTS idx_votes_room ON scrum_poker.votes(room_code);
CREATE INDEX IF NOT EXISTS idx_stories_room ON scrum_poker.stories(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON scrum_poker.rooms(last_activity);