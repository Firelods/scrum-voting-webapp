-- Enable Realtime for all tables in public schema
-- This script ensures that Realtime replication is properly configured
-- Enable Row Level Security (RLS) on all tables
-- Note: For now, we'll allow all operations, but in production you should add proper policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
-- Create permissive policies to allow all operations (for development)
-- In production, you should restrict these based on your security requirements
-- Rooms policies
DROP POLICY IF EXISTS "Allow all operations on rooms" ON public.rooms;
CREATE POLICY "Allow all operations on rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
-- Participants policies
DROP POLICY IF EXISTS "Allow all operations on participants" ON public.participants;
CREATE POLICY "Allow all operations on participants" ON public.participants FOR ALL USING (true) WITH CHECK (true);
-- Votes policies
DROP POLICY IF EXISTS "Allow all operations on votes" ON public.votes;
CREATE POLICY "Allow all operations on votes" ON public.votes FOR ALL USING (true) WITH CHECK (true);
-- Stories policies
DROP POLICY IF EXISTS "Allow all operations on stories" ON public.stories;
CREATE POLICY "Allow all operations on stories" ON public.stories FOR ALL USING (true) WITH CHECK (true);
-- Ensure tables are part of the realtime publication
-- First, try to remove them (in case they're already added)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.rooms;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.participants;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.votes;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.stories;
-- Now add them back
ALTER PUBLICATION supabase_realtime
ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime
ADD TABLE public.stories;
-- Set replica identity to FULL for all tables (important for DELETE events)
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.participants REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.stories REPLICA IDENTITY FULL;