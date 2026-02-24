"""Deep-merge utility for configuration inheritance."""

from api.models.asset_class_return import AssetClassReturn
from api.models.assumptions import Assumptions
from api.models.assumptions_override import (
    AssetClassReturnOverride,
    AssumptionsOverride,
)


def _resolve_asset_class(
    base: AssetClassReturn, override: AssetClassReturnOverride | None
) -> AssetClassReturn:
    """Merge a partial asset class override with a base value."""
    if override is None:
        return base
    return AssetClassReturn(
        expected_return=(
            override.expected_return
            if override.expected_return is not None
            else base.expected_return
        ),
        standard_deviation=(
            override.standard_deviation
            if override.standard_deviation is not None
            else base.standard_deviation
        ),
    )


def resolve_config(
    base: Assumptions, overrides: AssumptionsOverride | None
) -> Assumptions:
    """Deep-merge assumption overrides with a base configuration.

    For each field: if the override value is not None, use it; otherwise use the
    base value. For nested AssetClassReturn fields, apply the same logic
    recursively via AssetClassReturnOverride.
    """
    if overrides is None:
        return base

    return Assumptions(
        inflation_rate=(
            overrides.inflation_rate
            if overrides.inflation_rate is not None
            else base.inflation_rate
        ),
        wage_growth_rate=(
            overrides.wage_growth_rate
            if overrides.wage_growth_rate is not None
            else base.wage_growth_rate
        ),
        equity=_resolve_asset_class(base.equity, overrides.equity),
        intl_equity=_resolve_asset_class(base.intl_equity, overrides.intl_equity),
        fixed_income=_resolve_asset_class(base.fixed_income, overrides.fixed_income),
        cash=_resolve_asset_class(base.cash, overrides.cash),
        comp_limit=(
            overrides.comp_limit
            if overrides.comp_limit is not None
            else base.comp_limit
        ),
        deferral_limit=(
            overrides.deferral_limit
            if overrides.deferral_limit is not None
            else base.deferral_limit
        ),
        additions_limit=(
            overrides.additions_limit
            if overrides.additions_limit is not None
            else base.additions_limit
        ),
        catchup_limit=(
            overrides.catchup_limit
            if overrides.catchup_limit is not None
            else base.catchup_limit
        ),
        super_catchup_limit=(
            overrides.super_catchup_limit
            if overrides.super_catchup_limit is not None
            else base.super_catchup_limit
        ),
    )
