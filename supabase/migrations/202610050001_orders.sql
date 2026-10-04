create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'NEW' check (status in ('NEW','CONFIRMED','DISPATCHED','COMPLETED','CANCELLED')),
  customer_name text not null,
  phone text not null,
  email text,
  address text,
  district text,
  delivery_method text not null check (delivery_method in ('delivery','pickup')),
  payment_method text not null check (payment_method in ('cod','shop','digital')),
  note text,
  items jsonb not null,
  subtotal numeric(12, 2) not null default 0,
  unpriced_items integer not null default 0
);
alter table public.orders enable row level security;
-- No public policies: only the server (service role key) can read or write orders.
