"""Tests for the Persona model."""

from uuid import UUID

import pytest
from pydantic import ValidationError

from api.models import Persona, TargetDateAllocation


def _valid_kwargs():
    """Return minimal valid keyword arguments for Persona."""
    return {
        "name": "Alice",
        "label": "Mid-Career Professional",
        "age": 30,
        "tenure_years": 5,
        "salary": 75_000,
        "deferral_rate": 0.06,
        "current_balance": 50_000,
        "allocation": TargetDateAllocation(target_date_vintage=2065),
    }


class TestPersonaValid:
    def test_auto_generated_uuid(self):
        p = Persona(**_valid_kwargs())
        assert isinstance(p.id, UUID)

    def test_include_social_security_defaults_true(self):
        p = Persona(**_valid_kwargs())
        assert p.include_social_security is True


class TestPersonaAgeValidation:
    def test_age_below_18_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["age"] = 17
        with pytest.raises(ValidationError):
            Persona(**kwargs)

    def test_age_above_80_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["age"] = 81
        with pytest.raises(ValidationError):
            Persona(**kwargs)


class TestPersonaSalaryValidation:
    def test_negative_salary_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["salary"] = -1
        with pytest.raises(ValidationError):
            Persona(**kwargs)

    def test_zero_salary_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["salary"] = 0
        with pytest.raises(ValidationError):
            Persona(**kwargs)


class TestPersonaDeferralRateValidation:
    def test_deferral_rate_above_one_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["deferral_rate"] = 1.01
        with pytest.raises(ValidationError):
            Persona(**kwargs)

    def test_deferral_rate_below_zero_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["deferral_rate"] = -0.01
        with pytest.raises(ValidationError):
            Persona(**kwargs)


class TestPersonaCurrentBalanceValidation:
    def test_negative_current_balance_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["current_balance"] = -100
        with pytest.raises(ValidationError):
            Persona(**kwargs)


class TestPersonaSSClaimingAge:
    def test_default_claiming_age_is_67(self):
        p = Persona(**_valid_kwargs())
        assert p.ss_claiming_age == 67

    def test_valid_range_62_to_70_accepted(self):
        for age in range(62, 71):
            kwargs = _valid_kwargs()
            kwargs["ss_claiming_age"] = age
            p = Persona(**kwargs)
            assert p.ss_claiming_age == age

    def test_below_62_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["ss_claiming_age"] = 61
        with pytest.raises(ValidationError):
            Persona(**kwargs)

    def test_above_70_rejected(self):
        kwargs = _valid_kwargs()
        kwargs["ss_claiming_age"] = 71
        with pytest.raises(ValidationError):
            Persona(**kwargs)

    def test_existing_fields_unchanged(self):
        kwargs = _valid_kwargs()
        kwargs["ss_claiming_age"] = 65
        p = Persona(**kwargs)
        assert p.name == "Alice"
        assert p.age == 30
        assert p.salary == 75_000
        assert p.include_social_security is True

    def test_serialization_includes_ss_claiming_age(self):
        kwargs = _valid_kwargs()
        kwargs["ss_claiming_age"] = 65
        p = Persona(**kwargs)
        data = p.model_dump()
        assert "ss_claiming_age" in data
        assert data["ss_claiming_age"] == 65
