-- Check existing tables first
-- Run this to see what's already in your database

-- Check if tables exist and their structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check user_subscriptions structure if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND table_schema = 'public';