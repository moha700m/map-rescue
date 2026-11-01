-- MAP RESCUE AI — OpenRouter gateway storage
-- Run in Supabase SQL Editor when AI_STORAGE=supabase

create table if not exists ai_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Encrypted OpenRouter key (AES-256-GCM ciphertext only — never plaintext)
create table if not exists ai_secrets (
  id text primary key,
  ciphertext text not null,
  iv text not null,
  tag text not null,
  fingerprint text,
  provider text default 'openrouter',
  updated_at timestamptz default now()
);

create table if not exists ai_usage (
  id text primary key,
  at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists idx_ai_usage_at on ai_usage (at desc);

-- Service-role access only (server side). RLS blocks anon/authenticated clients.
alter table ai_settings enable row level security;
alter table ai_secrets enable row level security;
alter table ai_usage enable row level security;
