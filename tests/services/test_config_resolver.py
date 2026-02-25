"""Unit tests for config_resolver.resolve_config()."""

import pytest

from api.models.assumptions import Assumptions
from api.models.assumptions_override import AssumptionsOverride
from api.services.config_resolver import resolve_config


class TestResolveConfigNoOverride:
    def test_returns_base_unchanged_when_overrides_none(self):
        base = Assumptions()
        result = resolve_config(base, None)
        assert result == base

    def test_returns_same_instance_when_no_overrides(self):
        base = Assumptions()
        result = resolve_config(base, None)
        assert result is base


class TestResolveConfigScalarFields:
    def test_inflation_rate_overridden(self):
        base = Assumptions(inflation_rate=0.025)
        overrides = AssumptionsOverride(inflation_rate=0.03)
        result = resolve_config(base, overrides)
        assert result.inflation_rate == pytest.approx(0.03)

    def test_inflation_rate_inherited_when_none(self):
        base = Assumptions(inflation_rate=0.025)
        overrides = AssumptionsOverride(inflation_rate=None)
        result = resolve_config(base, overrides)
        assert result.inflation_rate == pytest.approx(0.025)

    def test_wage_growth_rate_overridden(self):
        base = Assumptions(wage_growth_rate=0.03)
        overrides = AssumptionsOverride(wage_growth_rate=0.04)
        result = resolve_config(base, overrides)
        assert result.wage_growth_rate == pytest.approx(0.04)

    def test_comp_limit_overridden(self):
        base = Assumptions(comp_limit=345_000)
        overrides = AssumptionsOverride(comp_limit=400_000)
        result = resolve_config(base, overrides)
        assert result.comp_limit == 400_000

    def test_comp_limit_inherited_when_none(self):
        base = Assumptions(comp_limit=345_000)
        overrides = AssumptionsOverride(comp_limit=None)
        result = resolve_config(base, overrides)
        assert result.comp_limit == 345_000


class TestResolveConfigAssetClasses:
    def test_equity_expected_return_overridden(self):
        base = Assumptions()
        overrides = AssumptionsOverride()
        overrides.equity = type(overrides).model_fields  # skip; test via dict
        from api.models.assumptions_override import AssetClassReturnOverride
        overrides2 = AssumptionsOverride(equity=AssetClassReturnOverride(expected_return=0.10))
        result = resolve_config(base, overrides2)
        assert result.equity.expected_return == pytest.approx(0.10)
        assert result.equity.standard_deviation == pytest.approx(base.equity.standard_deviation)

    def test_equity_std_overridden_return_inherited(self):
        from api.models.assumptions_override import AssetClassReturnOverride
        base = Assumptions()
        overrides = AssumptionsOverride(equity=AssetClassReturnOverride(standard_deviation=0.20))
        result = resolve_config(base, overrides)
        assert result.equity.expected_return == pytest.approx(base.equity.expected_return)
        assert result.equity.standard_deviation == pytest.approx(0.20)

    def test_asset_class_not_overridden_when_none(self):
        base = Assumptions()
        overrides = AssumptionsOverride(equity=None)
        result = resolve_config(base, overrides)
        assert result.equity == base.equity


class TestResolveConfigTargetReplacementRatio:
    def test_override_float_replaces_base_none(self):
        """Scenario sets a specific ratio when the workspace has no override."""
        base = Assumptions(target_replacement_ratio_override=None)
        overrides = AssumptionsOverride(target_replacement_ratio_override=0.72)
        result = resolve_config(base, overrides)
        assert result.target_replacement_ratio_override == pytest.approx(0.72)

    def test_override_float_replaces_base_float(self):
        """Scenario override wins over workspace-level override."""
        base = Assumptions(target_replacement_ratio_override=0.80)
        overrides = AssumptionsOverride(target_replacement_ratio_override=0.65)
        result = resolve_config(base, overrides)
        assert result.target_replacement_ratio_override == pytest.approx(0.65)

    def test_override_none_inherits_base_float(self):
        """Scenario does not set override → engine uses workspace-level value."""
        base = Assumptions(target_replacement_ratio_override=0.80)
        overrides = AssumptionsOverride(target_replacement_ratio_override=None)
        result = resolve_config(base, overrides)
        assert result.target_replacement_ratio_override == pytest.approx(0.80)

    def test_override_none_inherits_base_none(self):
        """Neither workspace nor scenario sets override → engine uses income-tier table."""
        base = Assumptions(target_replacement_ratio_override=None)
        overrides = AssumptionsOverride(target_replacement_ratio_override=None)
        result = resolve_config(base, overrides)
        assert result.target_replacement_ratio_override is None

    def test_invalid_override_above_one_rejected(self):
        with pytest.raises(Exception):
            AssumptionsOverride(target_replacement_ratio_override=1.5)

    def test_invalid_override_below_zero_rejected(self):
        with pytest.raises(Exception):
            AssumptionsOverride(target_replacement_ratio_override=-0.1)
