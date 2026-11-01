import type { CaseRecord } from './types';
import { COUNTRY_META } from './constants';

/** Builds the payload we send to the AI for a case — one shape for every task. */
export function caseTaskInput(record: CaseRecord) {
  return {
    caseCode: record.code,
    businessName: record.businessName,
    category: record.category,
    address: record.address,
    city: record.city,
    country: COUNTRY_META[record.country]?.label ?? record.country,
    website: record.website ?? '',
    phone: record.phone ?? '',
    suspensionDate: record.suspensionDate ?? '',
    suspensionMessage: record.suspensionMessage ?? '',
    previousAppeals: record.previousAppeals ?? 'لا يوجد',
    isStorefront: record.isStorefront,
    customersVisit: record.customersVisit,
    hasSignage: record.hasSignage,
    documents: record.documents.map((d) => ({
      name: d.name,
      type: d.category,
      status: d.status,
      extractedText: d.extractedText?.slice(0, 4000) ?? undefined,
    })),
    currentDiagnosis: record.diagnosis?.rootCause.label ?? null,
    documentReview: record.intel?.documents ?? null,
    evidenceReview: record.intel?.evidence ?? null,
  };
}
