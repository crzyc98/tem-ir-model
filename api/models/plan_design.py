"""PlanDesign model — complete specification of a retirement plan's contribution structure."""

from typing import Self

from pydantic import BaseModel, Field, model_validator

from api.models.core_contribution_tier import CoreContributionTier
from api.models.match_tier import MatchTier
from api.models.vesting import ImmediateVesting, VestingSchedule


class PlanDesign(BaseModel):
    """Complete specification of a retirement plan's contribution structure."""

    name: str
    match_tiers: list[MatchTier] = Field(default_factory=list, max_length=3)
    match_vesting: VestingSchedule = Field(default_factory=ImmediateVesting)
    match_eligibility_months: int = Field(default=0, ge=0, le=12)
    core_contribution_pct: float = Field(default=0.0, ge=0.0, le=1.0)
    core_age_service_tiers: list[CoreContributionTier] | None = Field(
        default=None, max_length=5
    )
    core_vesting: VestingSchedule = Field(default_factory=ImmediateVesting)
    core_eligibility_months: int = Field(default=0, ge=0, le=12)
    auto_enroll_enabled: bool = True
    auto_enroll_rate: float = Field(default=0.06, ge=0.0, le=1.0)
    # When True (default), the auto-enroll rate supersedes every persona's individual
    # deferral rate. When False, only unenrolled personas (deferral_rate == 0) are affected.
    auto_enroll_overrides_personal_rate: bool = True
    auto_escalation_enabled: bool = True
    auto_escalation_rate: float = Field(default=0.01, ge=0.0, le=1.0)
    auto_escalation_cap: float = Field(default=0.10, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_plan_design(self) -> Self:
        # FR-014: escalation cap must be >= enroll rate when both enabled
        if (
            self.auto_enroll_enabled
            and self.auto_escalation_enabled
            and self.auto_escalation_cap < self.auto_enroll_rate
        ):
            raise ValueError(
                f"auto_escalation_cap ({self.auto_escalation_cap}) must be >= "
                f"auto_enroll_rate ({self.auto_enroll_rate}) when both auto-enroll "
                f"and auto-escalation are enabled"
            )

        # FR-016: pairwise tier overlap detection
        if self.core_age_service_tiers and len(self.core_age_service_tiers) > 1:
            tiers = self.core_age_service_tiers
            for i in range(len(tiers)):
                for j in range(i + 1, len(tiers)):
                    if _tiers_overlap(tiers[i], tiers[j]):
                        raise ValueError(
                            f"Core contribution tiers {i} and {j} have overlapping ranges"
                        )

        return self


def _tiers_overlap(a: CoreContributionTier, b: CoreContributionTier) -> bool:
    """Check if two CoreContributionTier instances overlap.

    Two tiers overlap if they overlap on every dimension where both have
    non-null bounds. Tiers with no shared active dimensions are considered
    non-overlapping.
    """
    shared_dimensions = 0

    # Check age dimension
    a_has_age = a.min_age is not None or a.max_age is not None
    b_has_age = b.min_age is not None or b.max_age is not None
    if a_has_age and b_has_age:
        shared_dimensions += 1
        a_min = a.min_age if a.min_age is not None else float("-inf")
        a_max = a.max_age if a.max_age is not None else float("inf")
        b_min = b.min_age if b.min_age is not None else float("-inf")
        b_max = b.max_age if b.max_age is not None else float("inf")
        if not (a_min < b_max and b_min < a_max):
            return False

    # Check service dimension
    a_has_svc = a.min_service is not None or a.max_service is not None
    b_has_svc = b.min_service is not None or b.max_service is not None
    if a_has_svc and b_has_svc:
        shared_dimensions += 1
        a_min = a.min_service if a.min_service is not None else float("-inf")
        a_max = a.max_service if a.max_service is not None else float("inf")
        b_min = b.min_service if b.min_service is not None else float("-inf")
        b_max = b.max_service if b.max_service is not None else float("inf")
        if not (a_min < b_max and b_min < a_max):
            return False

    # No shared dimensions means non-overlapping (targeting disjoint populations)
    return shared_dimensions > 0
