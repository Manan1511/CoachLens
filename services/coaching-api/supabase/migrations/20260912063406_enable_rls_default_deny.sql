-- Backend accesses Supabase exclusively via the service_role key, which
-- bypasses RLS. Enabling RLS with no policies here means the anon/publishable
-- key (which could end up in a client app) gets zero access by default.
-- Add explicit policies later only if a client ever needs direct DB access.
alter table athletes enable row level security;
alter table sessions enable row level security;
alter table deliveries enable row level security;
alter table baselines enable row level security;
alter table drills enable row level security;
alter table verdicts enable row level security;
alter table coach_actions enable row level security;
