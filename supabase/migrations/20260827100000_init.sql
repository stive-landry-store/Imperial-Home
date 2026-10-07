-- Imperial Home — core schema
create extension if not exists "btree_gist";
create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'admin', 'main_admin');
create type public.property_status as enum ('draft', 'published', 'unpublished', 'archived');
create type public.reservation_status as enum (
  'pending',
  'payment_processing',
  'confirmed',
  'cancelled',
  'expired',
  'completed'
);
create type public.payment_status as enum (
  'pending',
  'processing',
  'successful',
  'failed',
  'cancelled',
  'refunded'
);
create type public.discount_type as enum ('percent', 'fixed');
create type public.block_type as enum ('blocked', 'maintenance');
create type public.document_type as enum ('housing_sheet', 'welcome_book');
create type public.message_role as enum ('customer', 'assistant', 'admin', 'system');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  title text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.admin_permissions (
  admin_id uuid not null references public.admin_profiles (id) on delete cascade,
  permission text not null,
  primary key (admin_id, permission),
  constraint admin_permissions_key_check check (
    permission in (
      'properties',
      'reservations',
      'customers',
      'promotions',
      'payments',
      'documents',
      'chat',
      'administrators'
    )
  )
);

create table public.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_fr text not null,
  icon text,
  created_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description_en text not null default '',
  description_fr text not null default '',
  welcome_message_en text,
  welcome_message_fr text,
  address text not null,
  city text not null default 'Douala',
  neighborhood text,
  country text not null default 'Cameroon',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  capacity integer not null default 2 check (capacity > 0),
  bedrooms integer not null default 1 check (bedrooms >= 0),
  bathrooms integer not null default 1 check (bathrooms >= 0),
  living_areas integer not null default 1 check (living_areas >= 0),
  kitchen_info_en text,
  kitchen_info_fr text,
  rules_en text,
  rules_fr text,
  safety_info_en text,
  safety_info_fr text,
  equipment_instructions_en text,
  equipment_instructions_fr text,
  check_in_time time not null default '14:00',
  check_out_time time not null default '11:00',
  nightly_rate_xaf integer not null check (nightly_rate_xaf >= 0),
  recommendations_en text,
  recommendations_fr text,
  status public.property_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_welcome_secrets (
  property_id uuid primary key references public.properties (id) on delete cascade,
  wifi_name text,
  wifi_password text,
  access_notes text,
  updated_at timestamptz not null default now()
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  url text,
  storage_path text,
  alt_en text,
  alt_fr text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  constraint property_images_src_check check (url is not null or storage_path is not null)
);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);

create table public.property_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  block_type public.block_type not null default 'blocked',
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint property_blocks_range_check check (end_date > start_date)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description_en text,
  description_fr text,
  discount_type public.discount_type not null,
  discount_value numeric(12, 2) not null check (discount_value > 0),
  starts_at date not null,
  ends_at date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promotions_dates_check check (ends_at >= starts_at)
);

create table public.promotion_properties (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  primary key (promotion_id, property_id)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null,
  property_id uuid not null references public.properties (id),
  customer_id uuid not null references public.profiles (id),
  check_in date not null,
  check_out date not null,
  guest_count integer not null check (guest_count > 0),
  nights integer generated always as (check_out - check_in) stored,
  base_amount_xaf integer not null,
  discount_xaf integer not null default 0,
  total_amount_xaf integer not null,
  promotion_id uuid references public.promotions (id),
  status public.reservation_status not null default 'pending',
  hold_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_dates_check check (check_out > check_in)
);

alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('pending', 'payment_processing', 'confirmed'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  amount_xaf integer not null,
  currency text not null default 'XAF',
  status public.payment_status not null default 'pending',
  provider text,
  provider_reference text,
  external_id text unique,
  idempotency_key text unique,
  confirmed_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  document_type public.document_type not null,
  storage_path text not null,
  generated_at timestamptz not null default now(),
  unique (reservation_id, document_type)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  property_id uuid references public.properties (id),
  reservation_id uuid references public.reservations (id),
  status text not null default 'open',
  needs_human boolean not null default false,
  assigned_admin_id uuid references public.profiles (id),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id),
  role public.message_role not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  link text,
  created_at timestamptz not null default now()
);

create index reservations_property_dates_idx on public.reservations (property_id, check_in, check_out);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_status_idx on public.reservations (status);
create index reservations_hold_idx on public.reservations (hold_expires_at) where status in ('pending', 'payment_processing');
create index payments_reservation_idx on public.payments (reservation_id);
create index payments_status_idx on public.payments (status);
create index properties_status_slug_idx on public.properties (status, slug);
create index property_images_property_idx on public.property_images (property_id, sort_order);
create index property_blocks_property_idx on public.property_blocks (property_id, start_date, end_date);
create index promotions_active_idx on public.promotions (is_active, starts_at, ends_at);
create index conversations_customer_idx on public.conversations (customer_id);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
