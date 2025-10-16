-- Add last_seen column to participants table for presence tracking
-- This allows us to identify which participants are currently active
ALTER TABLE public.participants
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- Create index for faster queries on last_seen
CREATE INDEX IF NOT EXISTS idx_participants_last_seen ON public.participants(last_seen);
-- Add a function to cleanup inactive participants (optional, for maintenance)
-- Participants are considered inactive if they haven't been seen in 5 minutes
CREATE OR REPLACE FUNCTION cleanup_inactive_participants() RETURNS void AS $$ BEGIN -- You can optionally delete or mark participants as inactive
    -- For now, we'll just rely on last_seen for UI filtering
    NULL;
END;
$$ LANGUAGE plpgsql;