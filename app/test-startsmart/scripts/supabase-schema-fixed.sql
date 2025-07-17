-- StartSmart Supabase Schema Setup (Fixed Dependencies)
-- Run this SQL in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (shared with NexTax.AI)
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

-- Create index on sessions expire
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- User subscriptions table (shared with NexTax.AI)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  stripe_customer_id VARCHAR,
  tier VARCHAR DEFAULT 'free',
  status VARCHAR DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
ON user_subscriptions(stripe_customer_id);

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

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "messageCount" INTEGER DEFAULT 0,
  "lastReset" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Document versions
CREATE TABLE IF NOT EXISTS document_versions (
  id VARCHAR PRIMARY KEY,
  "documentId" VARCHAR REFERENCES documents(id),
  "versionNumber" INTEGER,
  content TEXT,
  "changeLog" TEXT,
  "createdBy" VARCHAR REFERENCES users(id),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Legal reviews
CREATE TABLE IF NOT EXISTS legal_reviews (
  id VARCHAR PRIMARY KEY,
  "documentId" VARCHAR REFERENCES documents(id),
  "reviewerId" VARCHAR,
  status VARCHAR DEFAULT 'pending',
  "reviewType" VARCHAR,
  "requestedAt" TIMESTAMP DEFAULT NOW(),
  "completedAt" TIMESTAMP
);

-- Review comments
CREATE TABLE IF NOT EXISTS review_comments (
  id VARCHAR PRIMARY KEY,
  "reviewId" VARCHAR REFERENCES legal_reviews(id),
  "commenterId" VARCHAR REFERENCES users(id),
  content TEXT,
  "lineNumber" INTEGER,
  status VARCHAR DEFAULT 'open',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Operating agreements
CREATE TABLE IF NOT EXISTS operating_agreements (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "businessName" VARCHAR,
  state VARCHAR,
  "memberNames" TEXT[],
  "ownershipPercentages" INTEGER[],
  "managementStructure" VARCHAR,
  content TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Insert initial user subscription for testing
INSERT INTO user_subscriptions (user_id, tier, status) 
VALUES ('40936537', 'free', 'active') 
ON CONFLICT DO NOTHING;