export type CaseStatus =
  | 'new'
  | 'analyzing'
  | 'diagnosis_ready'
  | 'appeal_ready'
  | 'submitted'
  | 'reinstated'
  | 'rejected'
  | 'pending_docs';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface EvidenceDoc {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: 'commercial_reg' | 'utility' | 'license' | 'storefront' | 'signage' | 'video' | 'email' | 'screenshot' | 'other';
  addedAt: string;
  extractedText?: string;
  status: 'pending' | 'parsed' | 'failed';
}

export interface PolicyViolation {
  policy: string;
  riskLevel: RiskLevel;
  explanation: string;
}

export interface RecoveryStep {
  step: number;
  title: string;
  detail: string;
  owner: 'owner' | 'agency' | 'google';
}

export interface DiagnosisResult {
  rootCause: {
    label: string;
    confidence: number;
    evidence: string[];
    sourcePolicy?: string;
  };
  policyViolations: PolicyViolation[];
  missingDocuments: string[];
  evidenceGaps: string[];
  recommendedCorrection: string;
  riskLevel: RiskLevel;
  confidence: number;
  recoveryPlan: RecoveryStep[];
  appealDraft?: { ar?: string; en?: string };
  summary: string;
  disclaimer?: string;
}

export interface CaseRecord {
  id: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  businessName: string;
  category: string;
  city: string;
  country: string;
  address: string;
  website?: string;
  phone?: string;
  gbpId?: string;
  status: CaseStatus;
  riskLevel?: RiskLevel;
  confidence?: number;
  suspensionDate?: string;
  suspensionMessage?: string;
  previousAppeals?: string;
  isStorefront: boolean;
  customersVisit: boolean;
  hasSignage: boolean;
  diagnosis?: DiagnosisResult;
  appealAr?: string;
  appealEn?: string;
  /** Extra AI outputs produced by the automatic pipeline. */
  intel?: {
    evidence?: unknown;
    recommendations?: unknown;
    summary?: unknown;
    policy?: unknown;
    documents?: unknown;
  };
  documents: EvidenceDoc[];
  timeline: { at: string; label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' }[];
  fee?: number;
  /** Google Business Profile ID (ازرع الدخول: الإعدادات المتقدمة). */
  gbpProfileId?: string;
  appealSubmittedAt?: string;
  appealReference?: string;
  decisionAt?: string;
  decisionNote?: string;
}
