"""Tests for the Scenario model."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest

from api.models import Scenario, PlanDesign


def _valid_kwargs():
    """Return minimal valid keyword arguments for Scenario."""
    return {
        "workspace_id": uuid4(),
        "name": "Base Scenario",
        "plan_design": PlanDesign(name="Test"),
    }


class TestScenarioDefaults:
    def test_auto_generated_uuid(self):
        s = Scenario(**_valid_kwargs())
        assert isinstance(s.id, UUID)

    def test_auto_populated_created_at(self):
        s = Scenario(**_valid_kwargs())
        assert isinstance(s.created_at, datetime)

    def test_auto_populated_updated_at(self):
        s = Scenario(**_valid_kwargs())
        assert isinstance(s.updated_at, datetime)

    def test_description_defaults_to_none(self):
        s = Scenario(**_valid_kwargs())
        assert s.description is None

    def test_overrides_defaults_to_none(self):
        s = Scenario(**_valid_kwargs())
        assert s.overrides is None

    def test_last_run_at_defaults_to_none(self):
        s = Scenario(**_valid_kwargs())
        assert s.last_run_at is None


class TestScenarioRequiredFields:
    def test_workspace_id_is_required(self):
        with pytest.raises(Exception):
            Scenario(name="Test", plan_design=PlanDesign(name="Test"))

    def test_plan_design_is_required(self):
        with pytest.raises(Exception):
            Scenario(name="Test", workspace_id=uuid4())
