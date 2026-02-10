-- Migration: Add ticket splitting (parent-child relationship)
-- This allows splitting a large ticket into smaller child tickets during refinement

SET search_path TO scrum_poker;

-- Add parent_id column to stories table
ALTER TABLE scrum_poker.stories
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES scrum_poker.stories(id) ON DELETE CASCADE;

-- Create index for faster parent-child queries
CREATE INDEX IF NOT EXISTS idx_stories_parent ON scrum_poker.stories(parent_id);

-- Add jira_key column to store the extracted Jira key for easier lookups
ALTER TABLE scrum_poker.stories
ADD COLUMN IF NOT EXISTS jira_key TEXT;

-- Create index for jira_key lookups
CREATE INDEX IF NOT EXISTS idx_stories_jira_key ON scrum_poker.stories(jira_key);
