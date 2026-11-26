-- Starter leaderboard for sites created before the HowDidiDo board existed. Shown with a "Sample" badge;
-- publishing the real HowDidiDo export from /admin/draws replaces it. Existing values are never overwritten.
insert into "settings" ("key", "value") values
  ('hdid_title', 'Nakuru GC Order of Merit'),
  ('hdid_sample', '1'),
  ('hdid_leaderboard', 'Pos,Name,Handicap,Points
1,Sample Player A,12,41
2,Sample Player B,8,39
3,Sample Player C,18,38
4,Sample Player D,5,37
5,Sample Player E,22,36
6,Sample Player F,14,35
7,Sample Player G,10,34
8,Sample Player H,16,33')
on conflict ("key") do nothing;
