-- Complete database schema for StartSmart by NexTax.AI
-- This includes all tables from the Replit application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (core authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY NOT NULL,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  subscription_tier VARCHAR DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  month VARCHAR NOT NULL, -- Format: YYYY-MM
  message_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON ai_usage(user_id, month);

-- Business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  business_name VARCHAR,
  business_type VARCHAR,
  industry VARCHAR,
  state VARCHAR,
  description TEXT,
  entity_type VARCHAR, -- LLC, Corporation, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  business_id VARCHAR REFERENCES business_profiles(id),
  title VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY NOT NULL,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
  role VARCHAR NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  metadata JSONB, -- For storing additional AI response data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking table
CREATE TABLE IF NOT EXISTS progress_tasks (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  business_id VARCHAR REFERENCES business_profiles(id),
  category VARCHAR NOT NULL, -- 'foundation', 'legal', 'financial', etc.
  task_name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  order_index INTEGER DEFAULT 0,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated documents table
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  business_id VARCHAR REFERENCES business_profiles(id),
  document_type VARCHAR NOT NULL, -- 'operating_agreement', 'ss4_form', etc.
  title VARCHAR NOT NULL,
  content TEXT, -- HTML or markdown content
  status VARCHAR NOT NULL DEFAULT 'generated', -- 'draft', 'generated', 'downloaded'
  metadata JSONB, -- Document-specific data
  file_url VARCHAR, -- If stored as file
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business compliance profile
CREATE TABLE IF NOT EXISTS business_compliance (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  business_id VARCHAR REFERENCES business_profiles(id),
  state_of_formation VARCHAR,
  fiscal_year_end VARCHAR DEFAULT '12', -- Month number
  entity_type VARCHAR, -- LLC, Corp, etc.
  business_activities JSONB, -- Array of activities like retail, consulting
  has_employees BOOLEAN DEFAULT FALSE,
  has_retail_sales BOOLEAN DEFAULT FALSE,
  industry VARCHAR, -- NAICS industry code or description
  email_reminders_enabled BOOLEAN DEFAULT FALSE, -- Pro/Premium feature
  reminder_days_before INTEGER DEFAULT 30, -- Days before due date
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dynamic compliance tasks
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  compliance_id VARCHAR REFERENCES business_compliance(id),
  category VARCHAR NOT NULL, -- 'tax', 'legal', 'employment', 'licensing'
  task_name VARCHAR NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  priority VARCHAR DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern VARCHAR, -- 'monthly', 'quarterly', 'annually'
  auto_generated BOOLEAN DEFAULT FALSE,
  linked_document_id VARCHAR REFERENCES documents(id),
  state_specific BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  last_reminder_sent TIMESTAMP, -- Track when last reminder was sent
  next_due_date TIMESTAMP, -- For recurring tasks - next occurrence
  recurring_frequency VARCHAR, -- 'annual', 'quarterly', 'monthly'
  original_due_date TIMESTAMP, -- Store original due date for rollover calculation
  metadata JSONB, -- Additional task-specific data
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Operating Agreement data table
CREATE TABLE IF NOT EXISTS operating_agreements (
  id VARCHAR PRIMARY KEY NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  llc_name VARCHAR NOT NULL,
  agreement_date VARCHAR NOT NULL,
  state_of_formation VARCHAR NOT NULL,
  formation_date VARCHAR NOT NULL,
  registered_office_address TEXT NOT NULL,
  registered_agent_name VARCHAR NOT NULL,
  members JSONB NOT NULL, -- Array of member objects
  management_structure VARCHAR NOT NULL, -- "Member-managed" or "Manager-managed"
  financial_institution VARCHAR,
  authorized_signatories JSONB NOT NULL, -- Array of names
  tax_election VARCHAR NOT NULL, -- "Partnership", "S-Corp", "C-Corp"
  valuation_method VARCHAR NOT NULL,
  dissolution_terms TEXT NOT NULL,
  generated_document TEXT, -- AI-generated document content
  status VARCHAR DEFAULT 'draft', -- "draft", "generated", "finalized"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_progress_tasks_user_id ON progress_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_id ON compliance_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON compliance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_operating_agreements_user_id ON operating_agreements(user_id);
