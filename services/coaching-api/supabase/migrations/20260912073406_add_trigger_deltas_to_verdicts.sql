-- "Why was this flagged?" transparency card (PRD S5 mockup) needs the
-- specific prior deltas that triggered a MECHANICAL_WATCH/TECHNICAL_CONCERN,
-- not just the aggregate window_matches count. Persisted for the same
-- immutability reason as event_frame/observed_value_deg/confidence.
alter table verdicts add column trigger_deltas jsonb;
