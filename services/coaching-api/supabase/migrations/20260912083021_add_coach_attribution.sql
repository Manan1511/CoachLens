-- Coach identity comes from Supabase Auth (auth.users), verified via JWT in
-- the backend - we never handle passwords ourselves. These columns record
-- which coach took a human-in-the-loop action, for the audit trail PRD
-- Layer 3 requires ("Audit Logging: Save coach feedback for dataset asset").
alter table coach_actions add column coach_id uuid references auth.users(id);
alter table baselines add column confirmed_by uuid references auth.users(id);
