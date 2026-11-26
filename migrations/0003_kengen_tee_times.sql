-- Tee sheet for the KenGen Golf Day on an existing site: 50 tee times a day, 8 minutes apart from 6:30am, on both days.
insert into "tee_times" ("event_id", "starts_at")
select e.id, (d::date + time '06:30') at time zone 'Africa/Nairobi' + (n * interval '8 minutes')
from "events" e, generate_series(date '2026-11-27', date '2026-11-28', interval '1 day') d, generate_series(0, 49) n
where e.slug = 'kengen-golf-day-2026' and not exists (select 1 from "tee_times" t where t.event_id = e.id);
