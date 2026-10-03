create extension if not exists pgcrypto;

create table if not exists public.login_otps (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  request_count integer not null default 1 check (request_count >= 0),
  request_window_started_at timestamptz not null default now(),
  consumed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  role text not null check (role in ('INVENTORY_EDITOR', 'OWNER')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists staff_sessions_expiry_idx
  on public.staff_sessions (expires_at);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ne text,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text,
  name_en text,
  name_ne text,
  description_en text,
  description_ne text,
  category_id uuid references public.categories(id) on delete set null,
  category_name_en text,
  brand_id uuid references public.brands(id) on delete set null,
  brand_name text,
  model text,
  part_number text,
  specifications jsonb not null default '[]'::jsonb,
  applications jsonb not null default '[]'::jsonb,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  stock_status text check (stock_status is null or stock_status in ('AVAILABLE', 'OUT_OF_STOCK', 'UNKNOWN')),
  price numeric(12, 2) check (price is null or price >= 0),
  price_type text,
  verification_status text not null default 'DRAFT'
    check (verification_status in ('DRAFT', 'AI_IDENTIFICATION_PENDING', 'STAFF_REVIEW', 'OWNER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CORRECTION')),
  publication_status text not null default 'PRIVATE'
    check (publication_status in ('PRIVATE', 'PUBLISHED')),
  created_by text not null,
  approved_by text,
  ai_suggestions jsonb,
  ai_status text not null default 'NOT_REQUESTED'
    check (ai_status in ('NOT_REQUESTED', 'PENDING', 'READY', 'UNAVAILABLE', 'FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint published_products_are_approved check (
    publication_status <> 'PUBLISHED' or verification_status = 'APPROVED'
  )
);

create index if not exists products_public_catalog_idx
  on public.products (publication_status, verification_status, created_at desc);
create index if not exists products_staff_queue_idx
  on public.products (verification_status, created_by, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  sort_index integer not null default 0 check (sort_index >= 0),
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_index);

create table if not exists public.product_audit_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  actor_email text not null,
  action text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_audit_events_product_idx
  on public.product_audit_events (product_id, created_at);

create or replace function public.issue_login_otp(
  p_email text,
  p_code_hash text,
  p_expires_at timestamptz
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.login_otps%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(lower(trim(p_email))));
  select * into current_row
  from public.login_otps
  where email = lower(trim(p_email))
  for update;

  if found and current_row.request_window_started_at > now() - interval '15 minutes' then
    if current_row.request_count >= 3 then
      return 'rate_limited';
    end if;

    update public.login_otps
    set code_hash = p_code_hash,
        expires_at = p_expires_at,
        attempts = 0,
        consumed_at = null,
        request_count = request_count + 1,
        updated_at = now()
    where email = lower(trim(p_email));
  else
    insert into public.login_otps (
      email, code_hash, expires_at, attempts, request_count,
      request_window_started_at, consumed_at, updated_at
    )
    values (
      lower(trim(p_email)), p_code_hash, p_expires_at, 0, 1,
      now(), null, now()
    )
    on conflict (email) do update
      set code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          attempts = 0,
          request_count = 1,
          request_window_started_at = now(),
          consumed_at = null,
          updated_at = now();
  end if;

  return 'issued';
end;
$$;

create or replace function public.verify_login_otp(
  p_email text,
  p_code_hash text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.login_otps%rowtype;
begin
  select * into current_row
  from public.login_otps
  where email = lower(trim(p_email))
  for update;

  if not found or current_row.consumed_at is not null then
    return 'invalid';
  end if;

  if current_row.expires_at <= now() then
    update public.login_otps set consumed_at = now() where email = current_row.email;
    return 'expired';
  end if;

  if current_row.attempts >= 5 then
    return 'blocked';
  end if;

  if current_row.code_hash <> p_code_hash then
    update public.login_otps
    set attempts = attempts + 1, updated_at = now()
    where email = current_row.email;
    if current_row.attempts + 1 >= 5 then
      return 'blocked';
    end if;
    return 'invalid';
  end if;

  update public.login_otps
  set consumed_at = now(), updated_at = now()
  where email = current_row.email;
  return 'valid';
end;
$$;

create or replace function public.create_inventory_draft(
  p_actor text,
  p_slug text,
  p_images jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_product_id uuid;
  image_item jsonb;
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then
    raise exception 'unauthorized';
  end if;

  insert into public.products (slug, created_by, verification_status, publication_status)
  values (p_slug, lower(trim(p_actor)), 'DRAFT', 'PRIVATE')
  returning id into new_product_id;

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    insert into public.product_images (product_id, storage_path, mime_type, sort_index)
    values (
      new_product_id,
      image_item->>'storage_path',
      image_item->>'mime_type',
      (image_item->>'sort_index')::integer
    );
  end loop;

  insert into public.product_audit_events (product_id, actor_email, action, to_status)
  values (new_product_id, lower(trim(p_actor)), 'STOCK_UPLOADED', 'DRAFT');

  return new_product_id;
end;
$$;

create or replace function public.save_inventory_product(
  p_actor text,
  p_role text,
  p_product_id uuid,
  p_fields jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
begin
  select * into current_product
  from public.products
  where id = p_product_id
  for update;

  if not found then return false; end if;

  if p_role = 'INVENTORY_EDITOR' then
    if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com'
       or current_product.created_by <> lower(trim(p_actor))
       or current_product.verification_status not in ('DRAFT', 'STAFF_REVIEW', 'NEEDS_CORRECTION') then
      return false;
    end if;
  elsif p_role = 'OWNER' then
    if lower(trim(p_actor)) = 'bhattaraibikash38@gmail.com'
       or current_product.verification_status <> 'OWNER_REVIEW' then
      return false;
    end if;
  else
    return false;
  end if;

  update public.products
  set name_en = nullif(p_fields->>'name_en', ''),
      name_ne = nullif(p_fields->>'name_ne', ''),
      name = coalesce(nullif(p_fields->>'name_en', ''), nullif(p_fields->>'name_ne', '')),
      description_en = nullif(p_fields->>'description_en', ''),
      description_ne = nullif(p_fields->>'description_ne', ''),
      category_name_en = nullif(p_fields->>'category_name_en', ''),
      brand_name = nullif(p_fields->>'brand_name', ''),
      model = nullif(p_fields->>'model', ''),
      part_number = nullif(p_fields->>'part_number', ''),
      stock_quantity = case
        when nullif(p_fields->>'stock_quantity', '') is null then null
        else (p_fields->>'stock_quantity')::integer
      end,
      specifications = coalesce(p_fields->'specifications', '[]'::jsonb),
      applications = coalesce(p_fields->'applications', '[]'::jsonb),
      updated_at = now()
  where id = p_product_id;

  insert into public.product_audit_events (product_id, actor_email, action, from_status, to_status)
  values (p_product_id, lower(trim(p_actor)), 'PRODUCT_EDITED', current_product.verification_status, current_product.verification_status);
  return true;
end;
$$;

create or replace function public.submit_inventory_product(
  p_actor text,
  p_product_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then return false; end if;
  select * into current_product from public.products where id = p_product_id for update;
  if not found
     or current_product.created_by <> lower(trim(p_actor))
     or current_product.verification_status not in ('DRAFT', 'STAFF_REVIEW', 'NEEDS_CORRECTION')
     or coalesce(nullif(current_product.name_en, ''), nullif(current_product.name_ne, '')) is null then
    return false;
  end if;

  update public.products
  set verification_status = 'OWNER_REVIEW', publication_status = 'PRIVATE', updated_at = now()
  where id = p_product_id;
  insert into public.product_audit_events (product_id, actor_email, action, from_status, to_status)
  values (p_product_id, lower(trim(p_actor)), 'SUBMITTED_FOR_OWNER_APPROVAL', current_product.verification_status, 'OWNER_REVIEW');
  return true;
end;
$$;

create or replace function public.set_inventory_ai_suggestions(
  p_actor text,
  p_product_id uuid,
  p_suggestions jsonb,
  p_model text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then return false; end if;
  select * into current_product from public.products where id = p_product_id for update;
  if not found or current_product.created_by <> lower(trim(p_actor))
     or current_product.publication_status <> 'PRIVATE'
     or current_product.verification_status <> 'AI_IDENTIFICATION_PENDING'
     or current_product.ai_status <> 'PENDING' then
    return false;
  end if;

  update public.products
  set ai_suggestions = jsonb_build_object(
        'fields', p_suggestions,
        'label', 'AI Suggested',
        'model', p_model,
        'generated_at', now()
      ),
      ai_status = 'READY',
      verification_status = 'STAFF_REVIEW',
      updated_at = now()
  where id = p_product_id;
  insert into public.product_audit_events (product_id, actor_email, action, from_status, to_status)
  values (p_product_id, lower(trim(p_actor)), 'AI_DRAFT_GENERATED', current_product.verification_status, 'STAFF_REVIEW');
  return true;
end;
$$;

create or replace function public.begin_inventory_ai_request(
  p_actor text,
  p_product_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then return false; end if;
  select * into current_product
  from public.products
  where id = p_product_id
  for update;
  if not found or current_product.created_by <> lower(trim(p_actor))
     or current_product.publication_status <> 'PRIVATE'
     or current_product.verification_status <> 'DRAFT'
     or current_product.ai_status <> 'NOT_REQUESTED' then
    return false;
  end if;

  update public.products
  set ai_status = 'PENDING',
      verification_status = 'AI_IDENTIFICATION_PENDING',
      updated_at = now()
  where id = p_product_id;
  insert into public.product_audit_events (product_id, actor_email, action, from_status, to_status)
  values (p_product_id, lower(trim(p_actor)), 'AI_IDENTIFICATION_STARTED', 'DRAFT', 'AI_IDENTIFICATION_PENDING');
  return true;
end;
$$;

create or replace function public.fail_inventory_ai_request(
  p_actor text,
  p_product_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then return false; end if;
  update public.products
  set ai_status = 'FAILED',
      verification_status = 'STAFF_REVIEW',
      updated_at = now()
  where id = p_product_id
    and created_by = lower(trim(p_actor))
    and publication_status = 'PRIVATE'
    and verification_status = 'AI_IDENTIFICATION_PENDING'
    and ai_status = 'PENDING';
  if not found then return false; end if;
  insert into public.product_audit_events (product_id, actor_email, action, from_status, to_status)
  values (p_product_id, lower(trim(p_actor)), 'AI_IDENTIFICATION_FAILED', 'AI_IDENTIFICATION_PENDING', 'STAFF_REVIEW');
  return true;
end;
$$;

create or replace function public.record_ai_unavailable(
  p_actor text,
  p_product_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(trim(p_actor)) <> 'bhattaraibikash38@gmail.com' then return false; end if;
  update public.products
  set ai_status = 'UNAVAILABLE', updated_at = now()
  where id = p_product_id
    and created_by = lower(trim(p_actor))
    and publication_status = 'PRIVATE'
    and verification_status = 'DRAFT'
    and ai_status = 'NOT_REQUESTED';
  if not found then return false; end if;
  insert into public.product_audit_events (product_id, actor_email, action)
  values (p_product_id, lower(trim(p_actor)), 'AI_IDENTIFICATION_UNAVAILABLE');
  return true;
end;
$$;

create or replace function public.review_inventory_product(
  p_actor text,
  p_role text,
  p_product_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_product public.products%rowtype;
  next_status text;
  next_publication text := 'PRIVATE';
  audit_action text;
begin
  if p_role <> 'OWNER' or lower(trim(p_actor)) = 'bhattaraibikash38@gmail.com' then
    return false;
  end if;
  select * into current_product from public.products where id = p_product_id for update;
  if not found or current_product.verification_status <> 'OWNER_REVIEW' then return false; end if;

  if p_action = 'approve' then
    if coalesce(nullif(current_product.name_en, ''), nullif(current_product.name_ne, '')) is null then
      return false;
    end if;
    next_status := 'APPROVED';
    next_publication := 'PUBLISHED';
    audit_action := 'APPROVED_AND_PUBLISHED';
  elsif p_action = 'reject' then
    next_status := 'REJECTED';
    audit_action := 'REJECTED';
  elsif p_action = 'correction' then
    next_status := 'NEEDS_CORRECTION';
    audit_action := 'CORRECTION_REQUESTED';
  else
    return false;
  end if;

  update public.products
  set verification_status = next_status,
      publication_status = next_publication,
      approved_by = case when p_action = 'approve' then lower(trim(p_actor)) else approved_by end,
      published_at = case when p_action = 'approve' then now() else null end,
      updated_at = now()
  where id = p_product_id;

  insert into public.product_audit_events (
    product_id, actor_email, action, from_status, to_status, details
  )
  values (
    p_product_id, lower(trim(p_actor)), audit_action,
    current_product.verification_status, next_status, coalesce(p_details, '{}'::jsonb)
  );
  return true;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

alter table public.login_otps enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_audit_events enable row level security;

revoke all on public.login_otps, public.staff_sessions, public.categories,
  public.brands, public.products, public.product_images, public.product_audit_events
  from anon, authenticated;
grant all on public.login_otps, public.staff_sessions, public.categories,
  public.brands, public.products, public.product_images, public.product_audit_events
  to service_role;

revoke all on function public.issue_login_otp(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.verify_login_otp(text, text) from public, anon, authenticated;
revoke all on function public.create_inventory_draft(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.save_inventory_product(text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_inventory_product(text, uuid) from public, anon, authenticated;
revoke all on function public.set_inventory_ai_suggestions(text, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.begin_inventory_ai_request(text, uuid) from public, anon, authenticated;
revoke all on function public.fail_inventory_ai_request(text, uuid) from public, anon, authenticated;
revoke all on function public.record_ai_unavailable(text, uuid) from public, anon, authenticated;
revoke all on function public.review_inventory_product(text, text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.issue_login_otp(text, text, timestamptz) to service_role;
grant execute on function public.verify_login_otp(text, text) to service_role;
grant execute on function public.create_inventory_draft(text, text, jsonb) to service_role;
grant execute on function public.save_inventory_product(text, text, uuid, jsonb) to service_role;
grant execute on function public.submit_inventory_product(text, uuid) to service_role;
grant execute on function public.set_inventory_ai_suggestions(text, uuid, jsonb, text) to service_role;
grant execute on function public.begin_inventory_ai_request(text, uuid) to service_role;
grant execute on function public.fail_inventory_ai_request(text, uuid) to service_role;
grant execute on function public.record_ai_unavailable(text, uuid) to service_role;
grant execute on function public.review_inventory_product(text, text, uuid, text, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inventory-private',
  'inventory-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
