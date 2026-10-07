-- Additive only. Safe to run once in the Supabase SQL editor.
create table if not exists public.product_extras (
  product_slug text primary key,
  mrp numeric(12, 2) check (mrp is null or mrp >= 0),
  video_urls text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  name text not null check (char_length(name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 1000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now()
);
create index if not exists product_reviews_slug_idx on public.product_reviews (product_slug, status, created_at desc);

alter table public.product_extras enable row level security;
alter table public.product_reviews enable row level security;
-- No public policies: only the server (service role key) reads or writes these tables.