-- Verdicts are meant to be immutable historical records (coach audit trail,
-- PRD Layer 3), so the observed kinematics that produced them must be
-- persisted here rather than recomputed on every GET /reports/{id} - that
-- would be wasteful and could silently diverge if the algorithm changes.
alter table verdicts add column event_frame integer;
alter table verdicts add column observed_value_deg double precision;
alter table verdicts add column confidence double precision;
