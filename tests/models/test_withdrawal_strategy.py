"""Tests for WithdrawalStrategy protocol and SystematicWithdrawal implementation."""

import numpy as np
import pytest

from api.models.withdrawal_strategy import SystematicWithdrawal, WithdrawalStrategy


class TestProtocolConformance:
    def test_systematic_satisfies_protocol(self):
        assert isinstance(SystematicWithdrawal(), WithdrawalStrategy)


class TestPMTCorrectness:
    """Verify PMT formula: W_real = PV * r / (1 - (1+r)^(-N))."""

    def test_known_values(self):
        """PV=$100,000, r=0.04, N=26 → W ≈ $6,256.74."""
        strategy = SystematicWithdrawal()
        pv = np.array([100_000.0])
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": 0.0,  # zero inflation for pure real test
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        # PMT = 100000 * 0.04 / (1 - 1.04^-26)
        expected = 100_000 * 0.04 / (1.0 - 1.04 ** (-26))
        assert float(w[0]) == pytest.approx(expected, rel=1e-6)

    def test_higher_rate(self):
        """PV=$500,000, r=0.06, N=30."""
        strategy = SystematicWithdrawal()
        pv = np.array([500_000.0])
        params = {
            "total_years": 30,
            "real_return_rate": 0.06,
            "inflation_rate": 0.0,
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        # PMT = 500000 * 0.06 / (1 - 1.06^-30) = 36324.46...
        expected = 500_000 * 0.06 / (1.0 - 1.06 ** (-30))
        assert abs(float(w[0]) - expected) < 1.0


class TestZeroRealRate:
    def test_near_zero_rate_uses_simple_division(self):
        """When |r| < 0.0001, W = PV / N."""
        strategy = SystematicWithdrawal()
        pv = np.array([100_000.0])
        params = {
            "total_years": 25,
            "real_return_rate": 0.00005,  # below threshold
            "inflation_rate": 0.0,
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        assert abs(float(w[0]) - 4_000.0) < 0.01

    def test_exactly_zero_rate(self):
        strategy = SystematicWithdrawal()
        pv = np.array([200_000.0])
        params = {
            "total_years": 20,
            "real_return_rate": 0.0,
            "inflation_rate": 0.0,
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        assert abs(float(w[0]) - 10_000.0) < 0.01


class TestZeroBalance:
    def test_all_zero_balances(self):
        strategy = SystematicWithdrawal()
        pv = np.zeros(100)
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": 0.025,
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        np.testing.assert_array_equal(w, np.zeros(100))


class TestPartialDepletion:
    def test_mixed_balances(self):
        """$0 trials get $0, positive trials get PMT amount."""
        strategy = SystematicWithdrawal()
        current = np.array([0.0, 100_000.0, 50_000.0, 0.0])
        initial = np.array([0.0, 100_000.0, 100_000.0, 0.0])
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": 0.0,
        }
        w = strategy.calculate_withdrawal(current, 1, initial, params)
        assert float(w[0]) == 0.0
        assert float(w[3]) == 0.0
        assert float(w[1]) > 0.0
        assert float(w[2]) > 0.0


class TestCapAtBalance:
    def test_withdrawal_capped(self):
        """When PMT exceeds remaining balance, cap at balance."""
        strategy = SystematicWithdrawal()
        current = np.array([100.0, 100_000.0])
        initial = np.array([100_000.0, 100_000.0])
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": 0.0,
        }
        w = strategy.calculate_withdrawal(current, 1, initial, params)
        # First trial: PMT ≈ $6257 but balance is only $100
        assert float(w[0]) == pytest.approx(100.0)
        # Second trial: PMT < balance, gets full PMT
        expected = 100_000 * 0.04 / (1.0 - 1.04 ** (-26))
        assert float(w[1]) == pytest.approx(expected, rel=1e-6)


class TestNominalConversion:
    def test_year_1(self):
        strategy = SystematicWithdrawal()
        pv = np.array([100_000.0])
        inflation = 0.025
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": inflation,
        }
        w_real = 100_000 * 0.04 / (1.0 - 1.04 ** (-26))
        expected_nominal = w_real * (1.0 + inflation) ** 1
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        assert float(w[0]) == pytest.approx(expected_nominal, rel=1e-6)

    def test_year_5(self):
        strategy = SystematicWithdrawal()
        pv = np.array([100_000.0])
        inflation = 0.025
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": inflation,
        }
        w_real = 100_000 * 0.04 / (1.0 - 1.04 ** (-26))
        expected_nominal = w_real * (1.0 + inflation) ** 5
        w = strategy.calculate_withdrawal(pv, 5, pv, params)
        assert float(w[0]) == pytest.approx(expected_nominal, rel=1e-6)

    def test_year_26(self):
        strategy = SystematicWithdrawal()
        pv = np.array([100_000.0])
        inflation = 0.025
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": inflation,
        }
        w_real = 100_000 * 0.04 / (1.0 - 1.04 ** (-26))
        expected_nominal = w_real * (1.0 + inflation) ** 26
        w = strategy.calculate_withdrawal(pv, 26, pv, params)
        assert float(w[0]) == pytest.approx(expected_nominal, rel=1e-6)


class TestVectorization:
    @pytest.mark.parametrize("size", [1, 100, 10000])
    def test_output_shape_matches_input(self, size):
        strategy = SystematicWithdrawal()
        pv = np.full(size, 100_000.0)
        params = {
            "total_years": 26,
            "real_return_rate": 0.04,
            "inflation_rate": 0.025,
        }
        w = strategy.calculate_withdrawal(pv, 1, pv, params)
        assert w.shape == (size,)
