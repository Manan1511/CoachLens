"""WhatsApp coaching card formatter per PRD §10.3 and §4 Layer 3.

Produces human-readable, mobile-friendly markdown text summarizing
a delivery report, including kinematics, baseline comparisons, coach
drill prescriptions, and mandatory non-diagnostic disclaimers.
"""

from src.schemas.report import CoachingReport
from src.schemas.status import DeliveryStatus

EMOJI_CRICKET = "🏏"
EMOJI_CHECK = "✅"
EMOJI_WARNING = "⚠️"
EMOJI_STOP = "🚫"
EMOJI_ANGLE = "📐"
EMOJI_DRILL = "🏋️"
EMOJI_PENDING = "📊"
CLINICAL_DISCLAIMER_PREFIX = "Note"


def format_whatsapp_card(report: CoachingReport) -> str:
    status = report.verdict.status
    lines: list[str] = [
        f"{EMOJI_CRICKET} *CoachLens Biomechanical Review*",
        f"*Delivery:* {report.delivery_id}",
    ]

    if status == DeliveryStatus.DATA_SUPPRESSED:
        lines.extend([
            f"*Status:* {EMOJI_STOP} *DATA SUPPRESSED*",
            f"• {report.verdict.summary}",
        ])
    else:
        if status == DeliveryStatus.FORM_BENCHMARK:
            status_icon = EMOJI_CHECK
        elif status == DeliveryStatus.BENCHMARK_PENDING:
            status_icon = EMOJI_PENDING
        else:
            status_icon = EMOJI_WARNING
        status_display = status.value.replace("_", " ")
        lines.append(f"*Status:* {status_icon} *{status_display}*")
        lines.append(f"• {report.verdict.summary}")

        k = report.kinematics
        b = report.baselines
        kinematics_parts: list[str] = []
        if k.ffs_frame is not None:
            kinematics_parts.append(f"{EMOJI_ANGLE} *Kinematics at FFS (Frame {k.ffs_frame}):*")
        else:
            kinematics_parts.append(f"{EMOJI_ANGLE} *Kinematics:*")

        if k.front_knee_angle_deg is not None:
            kinematics_parts.append(f"• Front Knee Angle: {k.front_knee_angle_deg:.1f}°")

        if k.forward_trunk_tilt_deg is not None:
            kinematics_parts.append(f"• Forward Trunk Tilt: {k.forward_trunk_tilt_deg:.1f}°")

        if b.fixed_reference_median_deg is not None and b.fixed_reference_iqr_deg is not None:
            kinematics_parts.append(
                f"• Baseline Reference: {b.fixed_reference_median_deg:.1f}° (±{b.fixed_reference_iqr_deg:.1f}° IQR)"
            )

        if b.delta_deg is not None:
            sign = "+" if b.delta_deg > 0 else ""
            kinematics_parts.append(f"• Baseline Delta: {sign}{b.delta_deg:.1f}°")

        if report.verdict.window_matches > 0:
            kinematics_parts.append(
                f"• Pattern: {report.verdict.window_matches} of rolling window balls matched deviation"
            )

        lines.append("")
        lines.extend(kinematics_parts)

    if report.proposed_action is not None:
        drill = report.proposed_action
        lines.append("")
        lines.extend([
            f"{EMOJI_DRILL} *Recommended Drill:*",
            f"*{drill.title}* ({drill.drill_id})",
            f"• Protocol: {drill.prescription}",
            f"• Standard: {drill.credential}",
        ])
        if drill.contraindications:
            contraindications_str = ", ".join(drill.contraindications)
            lines.append(f"• Contraindications: {contraindications_str}")

    lines.append("")
    lines.append(f"{EMOJI_WARNING} *{CLINICAL_DISCLAIMER_PREFIX}:* {report.verdict.clinical_disclaimer}")

    return "\n".join(lines)
