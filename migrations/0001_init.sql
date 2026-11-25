create table if not exists "settings" (
  "key" text primary key,
  "value" text not null default ''
);

create table if not exists "customers" (
  "id" serial primary key,
  "phone" text not null unique,
  "name" text not null default '',
  "email" text default '',
  "company" text default '',
  "marketing_consent" boolean not null default false,
  "created_at" timestamptz not null default now()
);

create table if not exists "events" (
  "id" serial primary key,
  "slug" text not null unique,
  "name" text not null,
  "type" text not null,
  "starts_at" timestamptz not null,
  "ends_at" timestamptz not null,
  "venue" text not null default 'Nakuru Golf Club',
  "format" text not null default '',
  "summary" text not null default '',
  "description" text not null default '',
  "schedule" text not null default '',
  "rules" text not null default '',
  "prizes" text not null default '',
  "dress_code" text not null default '',
  "contact" text not null default '',
  "banner" text default '',
  "capacity" integer not null default 100,
  "title_sponsor" text default '',
  "results" text default '',
  "featured" boolean not null default false
);

create table if not exists "entry_types" (
  "id" serial primary key,
  "event_id" integer not null,
  "kind" text not null default 'entry',
  "name" text not null,
  "description" text default '',
  "price" integer not null,
  "price_member" integer,
  "players" integer not null default 1,
  "cap" integer,
  "sold" integer not null default 0,
  "deadline" timestamptz
);

create table if not exists "room_types" (
  "id" serial primary key,
  "name" text not null,
  "description" text default '',
  "beds" text default '',
  "capacity" integer not null default 2,
  "amenities" text default '',
  "rate" integer not null,
  "member_rate" integer,
  "corporate_rate" integer,
  "event_rate" integer,
  "image" text default '',
  "total_rooms" integer not null default 5
);

create table if not exists "menu_items" (
  "id" serial primary key,
  "category" text not null,
  "name" text not null,
  "description" text default '',
  "price" integer not null,
  "member_price" integer,
  "available" boolean not null default true
);

create table if not exists "car_wash_services" (
  "id" serial primary key,
  "name" text not null,
  "description" text default '',
  "price" integer not null,
  "duration_mins" integer not null default 30
);

create table if not exists "products" (
  "id" serial primary key,
  "category" text not null default 'merch',
  "name" text not null,
  "description" text default '',
  "price" integer not null,
  "bundle_price" integer,
  "stock" integer,
  "sizes" text default '',
  "image" text default '',
  "event_id" integer
);

create table if not exists "green_fees" (
  "id" serial primary key,
  "category" text not null,
  "weekday_9" integer not null,
  "weekday_18" integer not null,
  "weekend_9" integer not null,
  "weekend_18" integer not null
);

create table if not exists "lessons" (
  "id" serial primary key,
  "name" text not null,
  "kind" text not null default 'private',
  "coach" text default 'Club Professional',
  "description" text default '',
  "price" integer not null
);

create table if not exists "membership_categories" (
  "id" serial primary key,
  "name" text not null,
  "benefits" text default '',
  "joining_fee" integer not null,
  "annual_fee" integer not null
);

create table if not exists "memberships" (
  "id" serial primary key,
  "category_id" integer not null,
  "name" text not null,
  "phone" text not null,
  "email" text default '',
  "id_number" text default '',
  "proposer" text default '',
  "seconder" text default '',
  "documents" text default '',
  "consent" boolean not null default false,
  "status" text not null default 'received',
  "joined_at" timestamptz,
  "renewal_due" timestamptz,
  "created_at" timestamptz not null default now()
);

create table if not exists "partners" (
  "id" serial primary key,
  "slug" text not null unique,
  "name" text not null,
  "tier" text not null,
  "description" text default '',
  "story" text default '',
  "website" text default '',
  "years" text default '',
  "color" text default '#0f3d2e',
  "logo" text default ''
);

create table if not exists "sponsorships" (
  "id" serial primary key,
  "partner_id" integer not null,
  "event_id" integer,
  "role" text not null,
  "value" integer not null default 0,
  "contract_start" timestamptz default now(),
  "contract_end" timestamptz
);

create table if not exists "sponsor_packages" (
  "id" serial primary key,
  "name" text not null,
  "benefits" text default '',
  "price" integer
);

create table if not exists "manual_income" (
  "id" serial primary key,
  "stream" text not null,
  "description" text not null,
  "amount" integer not null,
  "event_id" integer,
  "received_at" timestamptz not null default now()
);

create table if not exists "news_posts" (
  "id" serial primary key,
  "slug" text not null unique,
  "title" text not null,
  "body" text not null,
  "category" text not null,
  "image" text default '',
  "published_at" timestamptz not null default now()
);

create table if not exists "gallery_photos" (
  "id" serial primary key,
  "album" text not null,
  "url" text not null,
  "caption" text default '',
  "event_id" integer
);

create table if not exists "leads" (
  "id" serial primary key,
  "type" text not null,
  "name" text not null,
  "company" text default '',
  "phone" text default '',
  "email" text default '',
  "details" jsonb default '{}'::jsonb,
  "status" text not null default 'new',
  "owner" text default '',
  "created_at" timestamptz not null default now()
);

create table if not exists "orders" (
  "id" serial primary key,
  "number" text not null unique,
  "customer_id" integer,
  "customer_name" text not null default '',
  "phone" text not null,
  "email" text default '',
  "subtotal" integer not null default 0,
  "discount" integer not null default 0,
  "total" integer not null default 0,
  "amount_due" integer not null default 0,
  "balance" integer not null default 0,
  "status" text not null default 'pending',
  "source" text not null default 'web',
  "promo_code" text default '',
  "po_ref" text default '',
  "is_member" boolean not null default false,
  "refund_reason" text default '',
  "created_at" timestamptz not null default now(),
  "paid_at" timestamptz
);

create index if not exists "orders_phone_idx" on "orders" ("phone");

create index if not exists "orders_status_idx" on "orders" ("status");

create table if not exists "order_lines" (
  "id" serial primary key,
  "order_id" integer not null,
  "kind" text not null,
  "ref_id" integer,
  "stream" text not null,
  "item_name" text not null,
  "qty" integer not null default 1,
  "unit_price" integer not null default 0,
  "total" integer not null default 0,
  "balance" integer not null default 0,
  "event_id" integer,
  "meta" jsonb default '{}'::jsonb
);

create index if not exists "order_lines_order_idx" on "order_lines" ("order_id");

create index if not exists "order_lines_event_idx" on "order_lines" ("event_id");

create table if not exists "payments" (
  "id" serial primary key,
  "order_id" integer not null,
  "method" text not null default 'mpesa',
  "mpesa_receipt" text,
  "checkout_request_id" text,
  "phone" text default '',
  "amount" integer not null,
  "status" text not null default 'pending',
  "mode" text not null default 'demo',
  "reconciled_at" timestamptz,
  "created_at" timestamptz not null default now()
);

create table if not exists "registrations" (
  "id" serial primary key,
  "order_line_id" integer not null,
  "order_id" integer not null,
  "event_id" integer not null,
  "entry_type_id" integer not null,
  "holder_name" text not null default '',
  "players" jsonb default '[]'::jsonb,
  "club" text default '',
  "shirt_size" text default '',
  "dietary" text default '',
  "qr_code" text not null unique,
  "checked_in_at" timestamptz
);

create table if not exists "bookings" (
  "id" serial primary key,
  "order_line_id" integer,
  "order_id" integer,
  "kind" text not null,
  "ref_id" integer,
  "label" text not null default '',
  "date" text not null default '',
  "end_date" text default '',
  "time" text default '',
  "qty" integer not null default 1,
  "guests" integer not null default 1,
  "status" text not null default 'held',
  "hold_expires" timestamptz,
  "name" text default '',
  "phone" text default '',
  "source" text not null default 'web',
  "details" jsonb default '{}'::jsonb,
  "created_at" timestamptz not null default now()
);

create index if not exists "bookings_kind_date_idx" on "bookings" ("kind", "date");

create table if not exists "otps" (
  "id" serial primary key,
  "phone" text not null,
  "code" text not null,
  "attempts" integer not null default 0,
  "expires_at" timestamptz not null,
  "created_at" timestamptz not null default now()
);

create table if not exists "notifications" (
  "id" serial primary key,
  "channel" text not null,
  "recipient" text not null,
  "body" text not null,
  "order_number" text,
  "dedupe_key" text unique,
  "status" text not null default 'queued',
  "created_at" timestamptz not null default now()
);

create table if not exists "audit_logs" (
  "id" serial primary key,
  "actor" text not null default 'staff',
  "action" text not null,
  "detail" text default '',
  "created_at" timestamptz not null default now()
);

create index if not exists "payments_checkout_idx" on "payments" ("checkout_request_id");
