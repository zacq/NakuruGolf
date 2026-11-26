create table if not exists "tee_times" (
  "id" serial primary key,
  "event_id" integer not null,
  "starts_at" timestamptz not null,
  "capacity" integer not null default 100,
  "players" integer not null default 4,
  "fee" integer not null default 200,
  "status" text not null default 'open',
  "seed_hash" text,
  "seed" text,
  "locked_at" timestamptz,
  "drawn_at" timestamptz
);

create index if not exists "tee_times_event_idx" on "tee_times" ("event_id", "starts_at");

create table if not exists "ballot_entries" (
  "id" serial primary key,
  "tee_time_id" integer not null,
  "event_id" integer not null,
  "order_id" integer not null,
  "name" text not null,
  "phone" text not null,
  "handicap" text default '',
  "hdid_id" text default '',
  "club" text default '',
  "mpesa_receipt" text default '',
  "result" text not null default 'entered',
  "position" integer,
  "created_at" timestamptz not null default now()
);

create index if not exists "ballot_entries_tee_idx" on "ballot_entries" ("tee_time_id");
create index if not exists "ballot_entries_phone_idx" on "ballot_entries" ("event_id", "phone");

-- Starter tee sheet for an existing site: 50 tee times, 8 minutes apart, on day one of the Nakuru Open.
insert into "tee_times" ("event_id", "starts_at")
select e.id, e.starts_at - interval '30 minutes' + (n * interval '8 minutes')
from "events" e, generate_series(0, 49) n
where e.slug = 'nakuru-open-2027' and not exists (select 1 from "tee_times" t where t.event_id = e.id);
