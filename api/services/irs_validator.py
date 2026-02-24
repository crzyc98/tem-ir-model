"""IRS contribution limit validation for plan designs."""

from api.models.assumptions import Assumptions
from api.models.irs_warning import IrsLimitWarning
from api.models.persona import Persona
from api.models.plan_design import PlanDesign


def validate_irs_limits(
    plan_design: PlanDesign,
    personas: list[Persona],
    effective_assumptions: Assumptions,
    retirement_age: int = 67,
) -> list[IrsLimitWarning]:
    """Validate a plan design against IRS contribution limits.

    Returns a list of warning objects (never raises). Two independent checks:
    1. Employer-side: max employer contribution vs additions_limit
    2. Employee-side: per-persona deferral projection vs applicable deferral limit
    """
    warnings: list[IrsLimitWarning] = []

    comp_limit = effective_assumptions.comp_limit
    additions_limit = effective_assumptions.additions_limit

    # --- Employer-side check ---
    max_match = sum(
        tier.match_rate * tier.on_first_pct * comp_limit
        for tier in plan_design.match_tiers
    )
    max_core = plan_design.core_contribution_pct * comp_limit
    total_employer = max_match + max_core

    if total_employer > additions_limit:
        warnings.append(
            IrsLimitWarning(
                type="employer_additions_limit",
                message=(
                    f"Maximum employer contribution (${total_employer:,.0f}) "
                    f"at comp limit exceeds annual additions limit "
                    f"(${additions_limit:,.0f})"
                ),
                persona_id=None,
                persona_name=None,
                limit_name="annual_additions_limit",
                limit_value=additions_limit,
                computed_value=total_employer,
                year=None,
            )
        )

    # --- Employee-side check ---
    deferral_limit = effective_assumptions.deferral_limit
    catchup_limit = effective_assumptions.catchup_limit
    super_catchup_limit = effective_assumptions.super_catchup_limit

    for persona in personas:
        deferral_rate = persona.deferral_rate

        if plan_design.auto_escalation_enabled:
            # Project forward year by year
            year = 0
            while True:
                age_this_year = persona.age + year
                if age_this_year >= retirement_age:
                    break

                computed_deferral = deferral_rate * min(persona.salary, comp_limit)
                applicable_limit = _get_deferral_limit(
                    age_this_year, deferral_limit, catchup_limit, super_catchup_limit
                )

                if computed_deferral > applicable_limit:
                    warnings.append(
                        IrsLimitWarning(
                            type="employee_deferral_limit",
                            message=(
                                f"Persona '{persona.name}' deferral "
                                f"(${computed_deferral:,.0f}) exceeds limit "
                                f"(${applicable_limit:,.0f}) at age {age_this_year} "
                                f"(year {year})"
                            ),
                            persona_id=persona.id,
                            persona_name=persona.name,
                            limit_name=_get_limit_name(age_this_year),
                            limit_value=applicable_limit,
                            computed_value=computed_deferral,
                            year=year,
                        )
                    )

                # Escalate for next year
                deferral_rate += plan_design.auto_escalation_rate
                if deferral_rate >= plan_design.auto_escalation_cap:
                    deferral_rate = plan_design.auto_escalation_cap
                    # Check this final capped rate at next age, then stop
                    age_next = persona.age + year + 1
                    if age_next < retirement_age:
                        computed_deferral = deferral_rate * min(
                            persona.salary, comp_limit
                        )
                        applicable_limit = _get_deferral_limit(
                            age_next,
                            deferral_limit,
                            catchup_limit,
                            super_catchup_limit,
                        )
                        if computed_deferral > applicable_limit:
                            warnings.append(
                                IrsLimitWarning(
                                    type="employee_deferral_limit",
                                    message=(
                                        f"Persona '{persona.name}' deferral "
                                        f"(${computed_deferral:,.0f}) exceeds limit "
                                        f"(${applicable_limit:,.0f}) at age "
                                        f"{age_next} (year {year + 1})"
                                    ),
                                    persona_id=persona.id,
                                    persona_name=persona.name,
                                    limit_name=_get_limit_name(age_next),
                                    limit_value=applicable_limit,
                                    computed_value=computed_deferral,
                                    year=year + 1,
                                )
                            )
                    break

                year += 1
        else:
            # No escalation — single check at current age
            computed_deferral = deferral_rate * min(persona.salary, comp_limit)
            applicable_limit = _get_deferral_limit(
                persona.age, deferral_limit, catchup_limit, super_catchup_limit
            )
            if computed_deferral > applicable_limit:
                warnings.append(
                    IrsLimitWarning(
                        type="employee_deferral_limit",
                        message=(
                            f"Persona '{persona.name}' deferral "
                            f"(${computed_deferral:,.0f}) exceeds limit "
                            f"(${applicable_limit:,.0f}) at age {persona.age}"
                        ),
                        persona_id=persona.id,
                        persona_name=persona.name,
                        limit_name=_get_limit_name(persona.age),
                        limit_value=applicable_limit,
                        computed_value=computed_deferral,
                        year=None,
                    )
                )

    return warnings


def _get_deferral_limit(
    age: int,
    deferral_limit: float,
    catchup_limit: float,
    super_catchup_limit: float,
) -> float:
    """Return the applicable deferral limit based on age."""
    if 60 <= age <= 63:
        return deferral_limit + super_catchup_limit
    if age >= 50:
        return deferral_limit + catchup_limit
    return deferral_limit


def _get_limit_name(age: int) -> str:
    """Return the name of the applicable limit for a given age."""
    if 60 <= age <= 63:
        return "super_catchup_limit"
    if age >= 50:
        return "catchup_limit"
    return "deferral_limit"
