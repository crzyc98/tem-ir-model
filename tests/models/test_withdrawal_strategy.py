"""Tests for WithdrawalStrategy protocol and ExpenseGapWithdrawal implementation."""

import numpy as np
import pytest

from api.models.withdrawal_strategy import ExpenseGapWithdrawal, WithdrawalStrategy


class TestProtocolConformance:
    def test_expense_gap_satisfies_protocol(self):
        assert isinstance(ExpenseGapWithdrawal(), WithdrawalStrategy)


class TestExpenseGapCorrectness:
    """Verify gap = expense_target - ss_income, floored at 0."""

    def _params(self, expense: float, ss: float) -> dict:
        return {
            "expense_target_real": expense,
            "ss_annual_real": ss,
            "total_years": 26,
            "real_return_rate": 0.03,
            "inflation_rate": 0.025,
        }

    def test_gap_is_expense_minus_ss(self):
        strategy = ExpenseGapWithdrawal()
        balance = np.array([500_000.0])
        params = self._params(expense=50_000.0, ss=15_000.0)
        w = strategy.calculate_withdrawal(balance, 1, balance, params)
        assert float(w[0]) == pytest.approx(35_000.0)

    def test_ss_fully_covers_expenses_returns_zero(self):
        """When SS >= expense_target, gap is 0 — no portfolio withdrawal needed."""
        strategy = ExpenseGapWithdrawal()
        balance = np.array([100_000.0])
        params = self._params(expense=40_000.0, ss=40_000.0)
        w = strategy.calculate_withdrawal(balance, 1, balance, params)
        assert float(w[0]) == 0.0

    def test_ss_exceeds_expenses_returns_zero(self):
        """SS > expense_target → gap clamped to 0."""
        strategy = ExpenseGapWithdrawal()
        balance = np.array([100_000.0])
        params = self._params(expense=30_000.0, ss=50_000.0)
        w = strategy.calculate_withdrawal(balance, 1, balance, params)
        assert float(w[0]) == 0.0


class TestYearInRetirementIgnored:
    """ExpenseGapWithdrawal returns constant real withdrawal — year is irrelevant."""

    def _params(self) -> dict:
        return {
            "expense_target_real": 50_000.0,
            "ss_annual_real": 15_000.0,
            "total_years": 26,
            "real_return_rate": 0.03,
            "inflation_rate": 0.025,
        }

    def test_year_1_equals_year_10(self):
        strategy = ExpenseGapWithdrawal()
        pv = np.array([500_000.0])
        w1 = strategy.calculate_withdrawal(pv, 1, pv, self._params())
        w10 = strategy.calculate_withdrawal(pv, 10, pv, self._params())
        assert float(w1[0]) == pytest.approx(float(w10[0]))

    def test_year_26_same_as_year_1(self):
        strategy = ExpenseGapWithdrawal()
        pv = np.array([500_000.0])
        w1 = strategy.calculate_withdrawal(pv, 1, pv, self._params())
        w26 = strategy.calculate_withdrawal(pv, 26, pv, self._params())
        assert float(w1[0]) == pytest.approx(float(w26[0]))


class TestVectorization:
    @pytest.mark.parametrize("size", [1, 100, 10_000])
    def test_output_shape_matches_input(self, size):
        strategy = ExpenseGapWithdrawal()
        balance = np.full(size, 300_000.0)
        params = {
            "expense_target_real": 45_000.0,
            "ss_annual_real": 12_000.0,
            "total_years": 26,
            "real_return_rate": 0.03,
            "inflation_rate": 0.025,
        }
        w = strategy.calculate_withdrawal(balance, 1, balance, params)
        assert w.shape == (size,)
        assert np.all(w == pytest.approx(33_000.0))
