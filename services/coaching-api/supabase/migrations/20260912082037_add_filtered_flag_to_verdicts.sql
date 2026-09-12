-- Records whether the Butterworth filter actually ran for this verdict's
-- delivery, or fell back to raw/unfiltered keypoints because there were too
-- few frames. Surfaced in Kinematics.filtered so callers can tell a noisier
-- measurement apart from a clean one, instead of silently treating both the
-- same way.
alter table verdicts add column filtered boolean;
