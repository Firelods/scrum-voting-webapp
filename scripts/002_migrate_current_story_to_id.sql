-- Migration: Change current_story_index to current_story_id
-- This migration converts the fragile index-based current story tracking
-- to a more robust ID-based approach that survives story reordering.

-- Step 1: Add new column for story ID
ALTER TABLE scrum_poker.rooms ADD COLUMN IF NOT EXISTS current_story_id INTEGER;

-- Step 2: Migrate existing data - convert index to actual story ID
-- For each room, find the story at the current index and set the ID
DO $$
DECLARE
    room_record RECORD;
    story_id_value INTEGER;
BEGIN
    FOR room_record IN SELECT code, current_story_index FROM scrum_poker.rooms
    LOOP
        -- Find the story at the current index
        SELECT id INTO story_id_value
        FROM scrum_poker.stories
        WHERE room_code = room_record.code
        ORDER BY order_index ASC
        LIMIT 1 OFFSET room_record.current_story_index;

        -- Update the room with the story ID
        IF story_id_value IS NOT NULL THEN
            UPDATE scrum_poker.rooms
            SET current_story_id = story_id_value
            WHERE code = room_record.code;
        END IF;
    END LOOP;
END $$;

-- Step 3: Drop the old column
ALTER TABLE scrum_poker.rooms DROP COLUMN IF EXISTS current_story_index;

-- Step 4: Add foreign key constraint (optional, for data integrity)
-- Note: This is commented out because the story might be deleted
-- ALTER TABLE scrum_poker.rooms
-- ADD CONSTRAINT fk_current_story
-- FOREIGN KEY (current_story_id) REFERENCES scrum_poker.stories(id) ON DELETE SET NULL;
