"""Tests for JSON round-trip serialization of all models (FR-011, US3-1)."""

from uuid import uuid4

import pytest

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


class TestJsonRoundTrip:
    """Each model should survive model_dump_json() -> model_validate_json() with zero data loss."""

    def test_asset_class_return(self):
        original = AssetClassReturn(expected_return=0.075, standard_deviation=0.17)
        restored = AssetClassReturn.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_match_tier(self):
        original = MatchTier(match_rate=1.0, on_first_pct=0.03)
        restored = MatchTier.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_immediate_vesting(self):
        original = ImmediateVesting()
        restored = ImmediateVesting.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_cliff_vesting(self):
        original = CliffVesting(years=3)
        restored = CliffVesting.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_graded_vesting(self):
        original = GradedVesting(
            schedule={1: 0.0, 2: 0.20, 3: 0.40, 4: 0.60, 5: 0.80, 6: 1.0}
        )
        restored = GradedVesting.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_core_contribution_tier(self):
        original = CoreContributionTier(
            min_age=25, max_age=35, contribution_pct=0.03
        )
        restored = CoreContributionTier.model_validate_json(
            original.model_dump_json()
        )
        assert restored == original

    def test_target_date_allocation(self):
        original = TargetDateAllocation(target_date_vintage=2065)
        restored = TargetDateAllocation.model_validate_json(
            original.model_dump_json()
        )
        assert restored == original

    def test_custom_allocation(self):
        original = CustomAllocation(stock_pct=0.60, bond_pct=0.30, cash_pct=0.10)
        restored = CustomAllocation.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_persona_uuid_preserved(self):
        original = Persona(
            name="Jordan",
            label="Early Career",
            age=25,
            tenure_years=1,
            salary=40_000,
            deferral_rate=0.03,
            current_balance=2_000,
            allocation=TargetDateAllocation(target_date_vintage=2065),
        )
        restored = Persona.model_validate_json(original.model_dump_json())
        assert restored.id == original.id
        assert restored == original

    def test_assumptions(self):
        original = Assumptions()
        restored = Assumptions.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_monte_carlo_config(self):
        original = MonteCarloConfig(seed=42)
        restored = MonteCarloConfig.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_plan_design_with_discriminated_unions(self):
        original = PlanDesign(
            name="Test Plan",
            match_tiers=[
                MatchTier(match_rate=1.0, on_first_pct=0.03),
                MatchTier(match_rate=0.5, on_first_pct=0.02),
            ],
            match_vesting=CliffVesting(years=3),
            core_vesting=GradedVesting(
                schedule={1: 0.0, 2: 0.20, 3: 0.40, 4: 0.60, 5: 0.80, 6: 1.0}
            ),
        )
        restored = PlanDesign.model_validate_json(original.model_dump_json())
        assert restored == original

    def test_workspace_with_personas_and_assumptions(self):
        original = Workspace(
            name="Test Workspace",
            client_name="Test Client",
            personas=[
                Persona(
                    name="Jordan",
                    label="Early Career",
                    age=25,
                    tenure_years=1,
                    salary=40_000,
                    deferral_rate=0.03,
                    current_balance=2_000,
                    allocation=TargetDateAllocation(target_date_vintage=2065),
                ),
            ],
        )
        restored = Workspace.model_validate_json(original.model_dump_json())
        assert restored.id == original.id
        assert restored.created_at == original.created_at
        assert restored.updated_at == original.updated_at
        assert len(restored.personas) == 1
        assert restored.personas[0].id == original.personas[0].id

    def test_scenario(self):
        workspace_id = uuid4()
        original = Scenario(
            workspace_id=workspace_id,
            name="Base Scenario",
            plan_design=PlanDesign(name="Test"),
        )
        restored = Scenario.model_validate_json(original.model_dump_json())
        assert restored.id == original.id
        assert restored.workspace_id == workspace_id
        assert restored.created_at == original.created_at
