from enum import StrEnum


class DeliveryStatus(StrEnum):
    """Canonical verdict status. This is the single source of truth for status
    names across measurement/interpretation/coaching — see BACKEND_PLAN.md's
    "Notes on resolved spec conflicts" for why MECHANICAL_WATCH was chosen
    over the PRD markdown's UNCLASSIFIED_DEVIATION.
    """

    DATA_SUPPRESSED = "DATA_SUPPRESSED"
    FORM_BENCHMARK = "FORM_BENCHMARK"
    MECHANICAL_WATCH = "MECHANICAL_WATCH"
    TECHNICAL_CONCERN = "TECHNICAL_CONCERN"


class WindowPattern(StrEnum):
    NOT_APPLICABLE = "NOT_APPLICABLE"
    ISOLATED = "ISOLATED"
    THREE_OF_FIVE_MATCHED = "3_OF_5_MATCHED"
