-- StartSmart Minimal Schema - Step by Step
-- Clear your editor completely and run this minimal version first

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Core tables without foreign keys
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  "firstName" VARCHAR,
  "lastName" VARCHAR,
  "profileImageUrl" VARCHAR,
  "subscriptionTier" VARCHAR DEFAULT 'free',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Step 2: Sessions table 
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Step 3: User subscriptions (simplified)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR,
  tier VARCHAR DEFAULT 'free',
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Insert test data
INSERT INTO user_subscriptions (user_id, tier, status) 
VALUES ('40936537', 'free', 'active') 
ON CONFLICT DO NOTHING;