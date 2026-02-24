"""Tests for JSON Schema export and validation (FR-012, US3-2)."""

import pytest
from jsonschema import Draft202012Validator
from pydantic import TypeAdapter

from api.models import (
    Assumptions,
    AssetClassReturn,
    CliffVesting,
    CoreContributionTier,
    CustomAllocation,
    GradedVesting,
    ImmediateVesting,
    MatchTier,
    MonteCarloConfig,
    Persona,
    PlanDesign,
    Scenario,
    TargetDateAllocation,
    Workspace,
)
from api.models.asset_allocation import AssetAllocation
from api.models.vesting import VestingSchedule


BASE_MODEL_TYPES = [
    AssetClassReturn,
    MatchTier,
    ImmediateVesting,
    CliffVesting,
    GradedVesting,
    CoreContributionTier,
    PlanDesign,
    TargetDateAllocation,
    CustomAllocation,
    Persona,
    Assumptions,
    MonteCarloConfig,
    Workspace,
    Scenario,
]

UNION_TYPES = [
    VestingSchedule,
    AssetAllocation,
]


class TestBaseModelSchemas:
    @pytest.mark.parametrize("model_cls", BASE_MODEL_TYPES, ids=lambda c: c.__name__)
    def test_schema_is_valid_json_schema(self, model_cls):
        schema = model_cls.model_json_schema()
        Draft202012Validator.check_schema(schema)

    @pytest.mark.parametrize("model_cls", BASE_MODEL_TYPES, ids=lambda c: c.__name__)
    def test_schema_has_properties(self, model_cls):
        schema = model_cls.model_json_schema()
        assert "properties" in schema or "$defs" in schema

    @pytest.mark.parametrize("model_cls", BASE_MODEL_TYPES, ids=lambda c: c.__name__)
    def test_schema_has_title(self, model_cls):
        schema = model_cls.model_json_schema()
        assert "title" in schema


class TestUnionTypeSchemas:
    @pytest.mark.parametrize("union_type", UNION_TYPES, ids=["VestingSchedule", "AssetAllocation"])
    def test_union_schema_is_valid(self, union_type):
        schema = TypeAdapter(union_type).json_schema()
        Draft202012Validator.check_schema(schema)
