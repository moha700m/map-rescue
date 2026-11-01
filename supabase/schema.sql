-- SQL Schema for MAP RESCUE AI
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers / Cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  business_name TEXT NOT NULL,
  business_category TEXT,
  country TEXT,
  city TEXT,
  business_address TEXT,
  maps_url TEXT,
  gbp_id TEXT,
  website TEXT,
  business_phone TEXT,
  
  -- Status
  current_status TEXT DEFAULT 'new', -- new, analyzing, diagnosis_ready, appeal_ready, submitted, reinstated, rejected, pending_docs
  suspension_date DATE,
  suspension_message TEXT,
  previous_appeals TEXT,
  
  -- Business type
  is_storefront BOOLEAN DEFAULT true,
  customers_visit BOOLEAN DEFAULT true,
  has_signage BOOLEAN DEFAULT false,
  registration_info TEXT,
  
  -- AI outputs
  diagnosis JSONB,
  root_cause TEXT,
  policy_violations TEXT[],
  missing_documents TEXT[],
  recommended_correction TEXT,
  risk_level TEXT, -- low, medium, high
  confidence INTEGER, -- 0-100
  recovery_plan JSONB,
  appeal_en TEXT,
  appeal_ar TEXT,
  
  -- Tracking
  appeal_reference TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  decision_date TIMESTAMPTZ,
  decision TEXT,
  internal_notes TEXT,
  service_fee DECIMAL(10,2),
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id)
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- supabase storage path
  file_type TEXT,
  category TEXT, -- commercial_reg, utility, license, storefront, signage, video, email, screenshot, other
  extracted_text TEXT,
  ocr_status TEXT DEFAULT 'pending',
  notes TEXT
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  case_id UUID REFERENCES cases(id),
  user_id UUID,
  action TEXT,
  details JSONB
);

-- Indexes
CREATE INDEX idx_cases_status ON cases(current_status);
CREATE INDEX idx_cases_created ON cases(created_at DESC);
CREATE INDEX idx_documents_case ON documents(case_id);

-- RLS Policies (enable after auth setup)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust for your admin roles)
-- CREATE POLICY "Admin full access" ON cases FOR ALL USING (auth.role() = 'authenticated');
