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
