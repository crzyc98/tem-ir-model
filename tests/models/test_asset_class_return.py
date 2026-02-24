"""Tests for AssetClassReturn model."""

import pytest
from pydantic import ValidationError

from api.models import AssetClassReturn


class TestAssetClassReturn:
    """Tests for the AssetClassReturn Pydantic model."""

    def test_valid_instantiation(self):
        """Valid instantiation with expected_return and standard_deviation."""
        obj = AssetClassReturn(expected_return=0.075, standard_deviation=0.17)
        assert obj.expected_return == 0.075
        assert obj.standard_deviation == 0.17

    def test_negative_standard_deviation_rejected(self):
        """Negative standard_deviation should be rejected (ge=0.0 constraint)."""
        with pytest.raises(ValidationError):
            AssetClassReturn(expected_return=0.075, standard_deviation=-0.01)

    def test_zero_standard_deviation_accepted(self):
        """Zero standard_deviation should be accepted as an edge case."""
        obj = AssetClassReturn(expected_return=0.075, standard_deviation=0.0)
        assert obj.standard_deviation == 0.0
