-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subscription_status VARCHAR(50) DEFAULT 'free',
    stripe_customer_id VARCHAR(255),
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Profiles Table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL, -- LLC, Corporation, Partnership, etc.
    industry VARCHAR(255),
    state VARCHAR(50),
    formation_status VARCHAR(50) DEFAULT 'planning', -- planning, in_progress, completed
    ein VARCHAR(20),
    formation_date DATE,
    registered_agent JSONB,
    business_address JSONB,
    mailing_address JSONB,
    officers JSONB, -- Array of officer information
    members JSONB, -- Array of member/shareholder information
    capital_structure JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- operating-agreement, bylaws, articles, etc.
    content JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, completed, signed
    file_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    category VARCHAR(100), -- formation, compliance, tax, legal, etc.
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- info, warning, error, success
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Items Table
CREATE TABLE IF NOT EXISTS compliance_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    category VARCHAR(100), -- tax, legal, regulatory, filing, etc.
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- monthly, quarterly, annually
    next_due_date TIMESTAMP WITH TIME ZONE,
    requirements JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress Tracking Table
CREATE TABLE IF NOT EXISTS progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL, -- business_planning, formation, compliance, operations
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, skipped
    completion_percentage INTEGER DEFAULT 0,
    data JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal Reviews Table
CREATE TABLE IF NOT EXISTS legal_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255),
    reviewer_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_review, completed, rejected
    comments TEXT,
    recommendations JSONB,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads Table (for tracking potential customers)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    source VARCHAR(100), -- quiz, contact_form, chat, etc.
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, converted, lost
    business_type VARCHAR(100),
    industry VARCHAR(255),
    expected_revenue VARCHAR(100),
    notes TEXT,
    quiz_results JSONB,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Workflows Table
CREATE TABLE IF NOT EXISTS automation_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(100) NOT NULL, -- business_created, task_due, document_signed, etc.
    trigger_conditions JSONB,
    actions JSONB NOT NULL, -- Array of actions to perform
    active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_compliance_items_user_id ON compliance_items(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_due_date ON compliance_items(due_date);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Create function to increment user usage
CREATE OR REPLACE FUNCTION increment_user_usage(user_id UUID, increment_by INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
    new_usage INTEGER;
BEGIN
    UPDATE user_profiles 
    SET usage_count = usage_count + increment_by,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING usage_count INTO new_usage;
    
    RETURN new_usage;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_items_updated_at BEFORE UPDATE ON compliance_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_tracking_updated_at BEFORE UPDATE ON progress_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_reviews_updated_at BEFORE UPDATE ON legal_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default compliance templates
INSERT INTO compliance_items (id, user_id, title, description, category, priority, due_date, recurring, recurrence_pattern) VALUES
(uuid_generate_v4(), uuid_generate_v4(), 'File Articles of Incorporation', 'Submit Articles of Incorporation to state', 'formation', 'high', NOW() + INTERVAL '7 days', false, null),
(uuid_generate_v4(), uuid_generate_v4(), 'Obtain EIN', 'Apply for Employer Identification Number from IRS', 'tax', 'high', NOW() + INTERVAL '14 days', false, null),
(uuid_generate_v4(), uuid_generate_v4(), 'Open Business Bank Account', 'Establish business banking relationship', 'financial', 'medium', NOW() + INTERVAL '21 days', false, null),
(uuid_generate_v4(), uuid_generate_v4(), 'Register for State Taxes', 'Register with state tax authority', 'tax', 'medium', NOW() + INTERVAL '30 days', false, null),
(uuid_generate_v4(), uuid_generate_v4(), 'Quarterly Tax Filing', 'File quarterly tax returns', 'tax', 'high', NOW() + INTERVAL '90 days', true, 'quarterly'),
(uuid_generate_v4(), uuid_generate_v4(), 'Annual Report Filing', 'File annual report with state', 'regulatory', 'medium', NOW() + INTERVAL '365 days', true, 'annually')
ON CONFLICT DO NOTHING;

-- Create Row Level Security policies (optional, for multi-tenant security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create appropriate RLS policies based on your authentication setup
-- Example policy (uncomment and modify as needed):
-- CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

