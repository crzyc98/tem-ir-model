"""Tests for MatchTier model."""

import pytest
from pydantic import ValidationError

from api.models import MatchTier


class TestMatchTier:
    """Tests for the MatchTier Pydantic model."""

    def test_valid_instantiation(self):
        """Valid instantiation with match_rate and on_first_pct."""
        obj = MatchTier(match_rate=1.0, on_first_pct=0.03)
        assert obj.match_rate == 1.0
        assert obj.on_first_pct == 0.03

    def test_match_rate_above_one_rejected(self):
        """match_rate > 1.0 should be rejected."""
        with pytest.raises(ValidationError):
            MatchTier(match_rate=1.01, on_first_pct=0.03)

    def test_match_rate_below_zero_rejected(self):
        """match_rate < 0.0 should be rejected."""
        with pytest.raises(ValidationError):
            MatchTier(match_rate=-0.01, on_first_pct=0.03)

    def test_on_first_pct_above_one_rejected(self):
        """on_first_pct > 1.0 should be rejected."""
        with pytest.raises(ValidationError):
            MatchTier(match_rate=1.0, on_first_pct=1.01)

    def test_on_first_pct_below_zero_rejected(self):
        """on_first_pct < 0.0 should be rejected."""
        with pytest.raises(ValidationError):
            MatchTier(match_rate=1.0, on_first_pct=-0.01)
