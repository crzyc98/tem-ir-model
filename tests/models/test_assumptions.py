"""Tests for the Assumptions model."""

import pytest
from pydantic import ValidationError

from api.models import Assumptions, AssetClassReturn


class TestAssumptionsDefaults:
    def test_inflation_rate_default(self):
        a = Assumptions()
        assert a.inflation_rate == 0.025

    def test_wage_growth_rate_default(self):
        a = Assumptions()
        assert a.wage_growth_rate == 0.03

    def test_salary_real_growth_rate_default(self):
        a = Assumptions()
        assert a.salary_real_growth_rate == 0.015

    def test_equity_expected_return_default(self):
        a = Assumptions()
        assert a.equity.expected_return == 0.075

    def test_equity_standard_deviation_default(self):
        a = Assumptions()
        assert a.equity.standard_deviation == 0.17

    def test_intl_equity_expected_return_default(self):
        a = Assumptions()
        assert a.intl_equity.expected_return == 0.07

    def test_intl_equity_standard_deviation_default(self):
        a = Assumptions()
        assert a.intl_equity.standard_deviation == 0.19

    def test_fixed_income_expected_return_default(self):
        a = Assumptions()
        assert a.fixed_income.expected_return == 0.04

    def test_fixed_income_standard_deviation_default(self):
        a = Assumptions()
        assert a.fixed_income.standard_deviation == 0.055

    def test_cash_expected_return_default(self):
        a = Assumptions()
        assert a.cash.expected_return == 0.03

    def test_cash_standard_deviation_default(self):
        a = Assumptions()
        assert a.cash.standard_deviation == 0.01

    def test_comp_limit_default(self):
        a = Assumptions()
        assert a.comp_limit == 345_000

    def test_deferral_limit_default(self):
        a = Assumptions()
        assert a.deferral_limit == 23_500

    def test_additions_limit_default(self):
        a = Assumptions()
        assert a.additions_limit == 70_000

    def test_catchup_limit_default(self):
        a = Assumptions()
        assert a.catchup_limit == 7_500

    def test_super_catchup_limit_default(self):
        a = Assumptions()
        assert a.super_catchup_limit == 11_250


class TestAssumptionsEdgeCases:
    def test_negative_expected_return_allowed(self):
        negative_equity = AssetClassReturn(expected_return=-0.05, standard_deviation=0.20)
        a = Assumptions(equity=negative_equity)
        assert a.equity.expected_return == -0.05
        assert a.equity.standard_deviation == 0.20


class TestTargetReplacementRatioOverride:
    def test_defaults_to_none(self):
        a = Assumptions()
        assert a.target_replacement_ratio_override is None

    def test_accepts_zero(self):
        a = Assumptions(target_replacement_ratio_override=0.0)
        assert a.target_replacement_ratio_override == 0.0

    def test_accepts_one(self):
        a = Assumptions(target_replacement_ratio_override=1.0)
        assert a.target_replacement_ratio_override == 1.0

    def test_accepts_midpoint(self):
        a = Assumptions(target_replacement_ratio_override=0.72)
        assert a.target_replacement_ratio_override == pytest.approx(0.72)

    def test_rejects_above_one(self):
        with pytest.raises(Exception):
            Assumptions(target_replacement_ratio_override=1.01)

    def test_rejects_below_zero(self):
        with pytest.raises(Exception):
            Assumptions(target_replacement_ratio_override=-0.01)
