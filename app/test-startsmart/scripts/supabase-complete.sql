-- StartSmart Complete Working Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  title VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY,
  "conversationId" VARCHAR REFERENCES conversations(id),
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS ai_usage (
  id VARCHAR PRIMARY KEY,
  "userId" VARCHAR REFERENCES users(id),
  "messageCount" INTEGER DEFAULT 0,
  "lastReset" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

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

INSERT INTO users (id, email, "subscriptionTier") 
VALUES ('40936537', 'morellosteve@gmail.com', 'free')
ON CONFLICT (id) DO NOTHING;