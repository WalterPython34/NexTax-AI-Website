-- StartSmart Compatible Schema
-- Works with existing user_subscriptions table structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  title VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY,
  "conversationId" VARCHAR REFERENCES conversations(id),
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Progress tasks
CREATE TABLE IF NOT EXISTS progress_tasks (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  status VARCHAR DEFAULT 'pending',
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  title VARCHAR NOT NULL,
  content TEXT,
  "documentType" VARCHAR,
  category VARCHAR,
  "isGenerated" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "messageCount" INTEGER DEFAULT 0,
  "lastReset" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Business profiles
CREATE TABLE IF NOT EXISTS business_profiles (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "businessName" VARCHAR,
  industry VARCHAR,
  "entityType" VARCHAR,
  state VARCHAR,
  "employeeCount" INTEGER,
  "foundingYear" INTEGER,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Business compliance
CREATE TABLE IF NOT EXISTS business_compliance (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "businessProfileId" VARCHAR REFERENCES business_profiles(id),
  state VARCHAR,
  "entityType" VARCHAR,
  "complianceData" JSONB,
  "lastUpdated" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Compliance tasks
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "complianceId" VARCHAR REFERENCES business_compliance(id),
  "taskType" VARCHAR,
  title VARCHAR,
  description TEXT,
  "dueDate" TIMESTAMP,
  status VARCHAR DEFAULT 'pending',
  priority VARCHAR DEFAULT 'medium',
  "formName" VARCHAR,
  "filingFee" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Insert initial user (works with existing subscription table)
INSERT INTO users (id, email, "subscriptionTier") 
VALUES ('40936537', 'morellosteve@gmail.com', 'free')
ON CONFLICT (id) DO NOTHING;

-- Work with existing user_subscriptions table structure
-- Insert using the existing column names (user_id, product_type, status)
INSERT INTO user_subscriptions (user_id, product_type, status) 
VALUES ('40936537', 'free', 'active')
ON CONFLICT DO NOTHING;