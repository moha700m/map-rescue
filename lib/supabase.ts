import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CaseStatus = 
  | 'new' 
  | 'analyzing' 
  | 'diagnosis_ready' 
  | 'appeal_ready' 
  | 'submitted' 
  | 'reinstated' 
  | 'rejected' 
  | 'pending_docs';

export interface Case {
  id: string;
  created_at: string;
  customer_name: string;
  business_name: string;
  current_status: CaseStatus;
  city?: string;
  country?: string;
  risk_level?: string;
  confidence?: number;
  diagnosis?: any;
  appeal_en?: string;
  appeal_ar?: string;
}