"""Tests for SSBenefitEstimate and SSEstimateResponse models."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from api.models.ss_estimator import SSBenefitEstimate, SSEstimateResponse


def _valid_estimate_kwargs():
    return {
        "persona_id": uuid4(),
        "persona_name": "Sarah",
        "claiming_age": 67,
        "monthly_benefit_today": 2450.0,
        "annual_benefit_today": 29400.0,
        "pia_monthly": 2450.0,
        "claiming_adjustment_factor": 1.0,
        "aime": 8500,
    }


class TestSSBenefitEstimateValid:
    def test_valid_construction(self):
        est = SSBenefitEstimate(**_valid_estimate_kwargs())
        assert est.persona_name == "Sarah"
        assert est.claiming_age == 67
        assert est.aime == 8500

    def test_aime_is_int(self):
        est = SSBenefitEstimate(**_valid_estimate_kwargs())
        assert isinstance(est.aime, int)

    def test_claiming_age_62_accepted(self):
        kwargs = _valid_estimate_kwargs()
        kwargs["claiming_age"] = 62
        est = SSBenefitEstimate(**kwargs)
        assert est.claiming_age == 62

    def test_claiming_age_70_accepted(self):
        kwargs = _valid_estimate_kwargs()
        kwargs["claiming_age"] = 70
        est = SSBenefitEstimate(**kwargs)
        assert est.claiming_age == 70

    def test_claiming_age_below_62_rejected(self):
        kwargs = _valid_estimate_kwargs()
        kwargs["claiming_age"] = 61
        with pytest.raises(ValidationError):
            SSBenefitEstimate(**kwargs)

    def test_claiming_age_above_70_rejected(self):
        kwargs = _valid_estimate_kwargs()
        kwargs["claiming_age"] = 71
        with pytest.raises(ValidationError):
            SSBenefitEstimate(**kwargs)

    def test_serialization_round_trip(self):
        est = SSBenefitEstimate(**_valid_estimate_kwargs())
        data = est.model_dump()
        restored = SSBenefitEstimate(**data)
        assert restored.aime == est.aime
        assert restored.monthly_benefit_today == est.monthly_benefit_today


class TestSSEstimateResponse:
    def test_response_with_estimates(self):
        wid = uuid4()
        est1 = SSBenefitEstimate(**_valid_estimate_kwargs())
        est2_kwargs = _valid_estimate_kwargs()
        est2_kwargs["persona_name"] = "Jordan"
        est2_kwargs["claiming_age"] = 62
        est2 = SSBenefitEstimate(**est2_kwargs)

        resp = SSEstimateResponse(workspace_id=wid, estimates=[est1, est2])
        assert resp.workspace_id == wid
        assert len(resp.estimates) == 2

    def test_empty_estimates(self):
        resp = SSEstimateResponse(workspace_id=uuid4(), estimates=[])
        assert len(resp.estimates) == 0
