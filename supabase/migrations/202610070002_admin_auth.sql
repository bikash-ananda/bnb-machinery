-- Additive only. Run once in the Supabase SQL editor.
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  role text not null check (role in (
    'SUPER_ADMIN','BUSINESS_OWNER','MANAGER','SALES_MANAGER','SALES_STAFF','CASHIER',
    'INVENTORY_MANAGER','WAREHOUSE_STAFF','PROCUREMENT_STAFF','ACCOUNTANT','SERVICE_MANAGER','TECHNICIAN')),
  password_hash text not null,
  must_change_password boolean not null default true,
  active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.admin_users(id) on delete cascade,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists admin_sessions_user_idx on public.admin_sessions (user_id);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_email text,
  actor_role text,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb,
  ip text
);
create index if not exists admin_audit_at_idx on public.admin_audit_events (at desc);

alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_audit_events enable row level security;
-- No public policies: only the server (service role key) can read or write these tables.