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


class SystematicWithdrawal:
    """Level-real-withdrawal strategy using the PMT annuity-depletion formula.

    Computes a constant real annual withdrawal that depletes the portfolio
    to $0 over the specified number of years, then converts to nominal
    dollars for each retirement year.
    """

    def calculate_withdrawal(
        self,
        current_balance: np.ndarray,
        year_in_retirement: int,
        initial_retirement_balance: np.ndarray,
        params: dict[str, Any],
    ) -> np.ndarray:
        total_years: int = params["total_years"]
        real_return_rate: float = params["real_return_rate"]
        inflation_rate: float = params["inflation_rate"]

        pv = initial_retirement_balance

        # PMT formula: W_real = PV * r / (1 - (1 + r)^(-N))
        if abs(real_return_rate) < 0.0001:
            w_real = pv / total_years
        else:
            r = real_return_rate
            n = total_years
            w_real = pv * r / (1.0 - (1.0 + r) ** (-n))

        # Convert to nominal: W_nominal = W_real * (1 + inflation)^year_in_retirement
        w_nominal = w_real * (1.0 + inflation_rate) ** year_in_retirement

        # Cap at current balance (no negative balances); zero balance → zero withdrawal
        w_nominal = np.minimum(w_nominal, np.maximum(current_balance, 0.0))

        return w_nominal
