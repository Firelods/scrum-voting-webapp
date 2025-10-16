-- Cleanup script to remove rooms that haven't been active in 24 hours
-- This helps keep the database clean and performant

DELETE FROM rooms 
WHERE last_activity < NOW() - INTERVAL '24 hours';
