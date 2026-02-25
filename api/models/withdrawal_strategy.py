"""Withdrawal strategy protocol and default implementation."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

import numpy as np


@runtime_checkable
class WithdrawalStrategy(Protocol):
    """Structural interface for withdrawal strategies.

    Any class implementing ``calculate_withdrawal`` with the matching
    signature satisfies this protocol — no inheritance required.
    """

    def calculate_withdrawal(
        self,
        current_balance: np.ndarray,
        year_in_retirement: int,
        initial_retirement_balance: np.ndarray,
        params: dict[str, Any],
    ) -> np.ndarray: ...


class ExpenseGapWithdrawal:
    """Withdraw only enough from the portfolio to cover the income gap.

    gap = expense_target_real - ss_annual_real  (both in today's dollars)
    Returns a constant real (today's dollars) vector: full gap or 0 if ss covers all.
    The engine caps at current_balance, so the protocol's cap logic is preserved.
    """

    def calculate_withdrawal(
        self,
        current_balance: np.ndarray,
        year_in_retirement: int,
        initial_retirement_balance: np.ndarray,
        params: dict[str, Any],
    ) -> np.ndarray:
        expense_target: float = params["expense_target_real"]
        ss_income: float = params["ss_annual_real"]
        gap = max(0.0, expense_target - ss_income)
        return np.full_like(current_balance, gap)
