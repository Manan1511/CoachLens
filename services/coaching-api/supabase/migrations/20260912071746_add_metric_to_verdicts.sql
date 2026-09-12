-- Without this, rolling-window history for front_knee_angle_deg and
-- forward_trunk_tilt_deg would be mixed together once both metrics are
-- wired into the pipeline (currently only front_knee_angle_deg is).
alter table verdicts add column metric text not null default 'front_knee_angle_deg';
create index verdicts_metric_idx on verdicts(metric);
