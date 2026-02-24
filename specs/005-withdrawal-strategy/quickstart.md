# Quickstart: Withdrawal Strategy Interface

**Feature**: 005-withdrawal-strategy
**Branch**: `005-withdrawal-strategy`

## Prerequisites

- Python 3.12+
- Existing dependencies installed (`pip install -r api/requirements.txt`)

## What's changing

This feature extends the existing Monte Carlo simulation to include a **distribution phase** (retirement age → planning age). After the accumulation phase builds a retirement balance, the simulation continues by withdrawing a level real annual amount designed to deplete the portfolio to $0 at the planning age.

### Files to create

| File | Purpose |
|------|---------|
| `api/models/withdrawal_strategy.py` | WithdrawalStrategy protocol + SystematicWithdrawal implementation |
| `tests/services/test_simulation_distribution.py` | Distribution phase unit tests |
| `tests/models/test_withdrawal_strategy.py` | Strategy model/calculation tests |
| `tests/integration/test_pluggability.py` | Pluggability validation test |

### Files to modify

| File | Change |
|------|--------|
| `api/models/simulation_result.py` | Add optional `withdrawal` to YearSnapshot, `annual_withdrawal` + `planning_age` to response models |
| `api/services/simulation_engine.py` | Add distribution phase loop after accumulation, accept WithdrawalStrategy parameter |
| `api/routers/simulations.py` | Pass planning_age to SimulationResponse |

## Key implementation details

### WithdrawalStrategy Protocol

```python
from typing import Any, Protocol
import numpy as np

class WithdrawalStrategy(Protocol):
    def calculate_withdrawal(
        self,
        current_balance: np.ndarray,
        year_in_retirement: int,
        initial_retirement_balance: np.ndarray,
        params: dict[str, Any],
    ) -> np.ndarray: ...
```

### PMT formula (SystematicWithdrawal)

```python
# Real return rate (Fisher formula)
r_real = (1 + r_nominal) / (1 + inflation) - 1

# Level real withdrawal
if abs(r_real) > 0.0001:
    W_real = PV * r_real / (1 - (1 + r_real) ** (-N))
else:
    W_real = PV / N

# Nominal withdrawal for year k
W_nominal = W_real * (1 + inflation) ** k
```

### Distribution phase loop (pseudocode)

```python
for year_idx in range(1, distribution_years + 1):
    age = retirement_age + year_idx
    year_in_retirement = year_idx

    # 1. Compute nominal withdrawal
    W_nominal = strategy.calculate_withdrawal(balances, year_in_retirement, retirement_balances, params)

    # 2. Cap withdrawal at current balance, subtract
    W_nominal = np.minimum(W_nominal, balances)
    balances = balances - W_nominal

    # 3. Investment returns (reuse existing logic)
    stock_pct, bond_pct, cash_pct = _get_allocation(persona, current_calendar_year)
    blended_return = stock_pct * eq_ret + bond_pct * fi_ret + cash_pct * ca_ret
    balances = balances * (1 + blended_return)

    # 4. Floor at zero
    balances = np.maximum(balances, 0.0)

    # 5. Record snapshot with real withdrawal amount
    W_real = W_nominal / ((1 + inflation) ** year_in_retirement)
    all_balances.append(balances.copy())
    all_withdrawals.append(W_real.copy())
```

## Running tests

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
python -m pytest tests/ -v
```

## Validation checklist

- [ ] Accumulation-phase results unchanged (compare with/without distribution phase)
- [ ] Median (p50) balance reaches ~$0 at planning age
- [ ] Withdrawal amounts constant in real terms across distribution years
- [ ] Trials that deplete early show $0 withdrawal and $0 balance for remaining years
- [ ] Glide path continues shifting through retirement for target-date allocations
- [ ] Custom allocations remain fixed through distribution phase
- [ ] Alternative strategy (e.g., fixed-dollar) works without engine changes
- [ ] Performance: 1k trials × 8 personas < 10s, 10k × 8 personas < 60s
