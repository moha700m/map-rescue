'use client';

import { useEffect, useState } from 'react';
import type { CaseRecord, DiagnosisResult, EvidenceDoc } from '../types';
import type { UsageEntry } from '../ai/contracts';
import { uid } from '../utils';

const CASES_KEY = 'mra.cases.v2';
const USAGE_KEY = 'mra.usage.v2';
const SEEDED_KEY = 'mra.seeded.v2';

const EVENT = 'mra:store';

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/* ------------------------------------------------------------------ */
/* Usage log                                                           */
/* ------------------------------------------------------------------ */

export function getUsageRows(): UsageEntry[] {
  return read<UsageEntry[]>(USAGE_KEY, []);
}

export function pushUsage(entry: UsageEntry) {
  const rows = getUsageRows();
  rows.unshift(entry);
  write(USAGE_KEY, rows.slice(0, 400));
  emit();
}

export function clearUsage() {
  write(USAGE_KEY, []);
  emit();
}

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

export function getCases(): CaseRecord[] {
  return read<CaseRecord[]>(CASES_KEY, []);
}

export function setCases(cases: CaseRecord[]) {
  write(CASES_KEY, cases);
  emit();
}

export function upsertCase(record: CaseRecord) {
  const cases = getCases();
  const idx = cases.findIndex((c) => c.id === record.id);
  const next = { ...record, updatedAt: new Date().toISOString() };
  if (idx >= 0) cases[idx] = next;
  else cases.unshift(next);
  write(CASES_KEY, cases);
  emit();
  return next;
}

export function deleteCase(id: string) {
  setCases(getCases().filter((c) => c.id !== id));
}

export function nextCaseCode() {
  const year = new Date().getFullYear();
  const count = getCases().length + 1;
  return `MRA-${year}-${String(count).padStart(4, '0')}`;
}

export function newCaseDraft(): CaseRecord {
  const now = new Date().toISOString();
  return {
    id: uid('case'),
    code: nextCaseCode(),
    createdAt: now,
    updatedAt: now,
    customerName: '',
    customerPhone: '',
    businessName: '',
    category: '',
    city: '',
    country: 'SA',
    address: '',
    status: 'new',
    isStorefront: true,
    customersVisit: true,
    hasSignage: false,
    documents: [],
    timeline: [{ at: now, label: 'تم إنشاء القضية', tone: 'neutral' }],
  };
}

export function makeDoc(partial: Partial<EvidenceDoc> & { name: string; mimeType: string }): EvidenceDoc {
  return {
    id: uid('doc'),
    size: 0,
    category: 'other',
    addedAt: new Date().toISOString(),
    status: 'pending',
    ...partial,
  } as EvidenceDoc;
}

/* ------------------------------------------------------------------ */
/* React bindings                                                      */
/* ------------------------------------------------------------------ */

/**
 * Reads from localStorage after mount only. The first client render must match
 * the server-rendered HTML (which has no stored data) to avoid hydration errors.
 */
function useStoreValue<T>(selector: () => T, empty: T): T {
  const [value, setValue] = useState<T>(empty);

  useEffect(() => {
    const update = () => setValue(selector());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

export function useCases() {
  return useStoreValue<CaseRecord[]>(getCases, []);
}

export function useUsageRows() {
  return useStoreValue<UsageEntry[]>(getUsageRows, []);
}

export function clearWorkspace() {
  write(CASES_KEY, []);
  write(USAGE_KEY, []);
  if (typeof window !== 'undefined') window.localStorage.setItem(SEEDED_KEY, '1');
  emit();
}
