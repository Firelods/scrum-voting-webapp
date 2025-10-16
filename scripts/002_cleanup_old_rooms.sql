-- Cleanup script to remove rooms that haven't been active in 24 hours
-- This helps keep the database clean and performant
SET search_path TO scrum_poker;
DELETE FROM scrum_poker.rooms
WHERE last_activity < NOW() - INTERVAL '24 hours';