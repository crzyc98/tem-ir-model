"""Shared test fixtures for model tests."""

from uuid import uuid4

import pytest

from api.models import (
    Assumptions,
    CliffVesting,
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


@pytest.fixture
def valid_match_tier():
    return MatchTier(match_rate=1.0, on_first_pct=0.03)


@pytest.fixture
def valid_vesting_immediate():
    return ImmediateVesting()


@pytest.fixture
def valid_vesting_cliff():
    return CliffVesting(years=3)


@pytest.fixture
def valid_vesting_graded():
    return GradedVesting(
        schedule={1: 0.0, 2: 0.20, 3: 0.40, 4: 0.60, 5: 0.80, 6: 1.0}
    )


@pytest.fixture
def valid_asset_allocation_target():
    return TargetDateAllocation(target_date_vintage=2065)


@pytest.fixture
def valid_asset_allocation_custom():
    return CustomAllocation(stock_pct=0.60, bond_pct=0.30, cash_pct=0.10)


@pytest.fixture
def valid_persona(valid_asset_allocation_target):
    return Persona(
        name="Jordan",
        label="Early Career Entry-Level",
        age=25,
        tenure_years=1,
        salary=40_000,
        deferral_rate=0.03,
        current_balance=2_000,
        allocation=valid_asset_allocation_target,
    )


@pytest.fixture
def default_assumptions():
    return Assumptions()


@pytest.fixture
def valid_plan_design(valid_match_tier, valid_vesting_graded):
    return PlanDesign(
        name="Standard 401(k)",
        match_tiers=[
            valid_match_tier,
            MatchTier(match_rate=0.5, on_first_pct=0.02),
        ],
        match_vesting=valid_vesting_graded,
        core_contribution_pct=0.03,
    )


@pytest.fixture
def valid_workspace(valid_persona):
    return Workspace(
        name="Test Workspace",
        client_name="Test Client",
        personas=[valid_persona],
    )


@pytest.fixture
def valid_scenario(valid_plan_design):
    return Scenario(
        workspace_id=uuid4(),
        name="Base Scenario",
        plan_design=valid_plan_design,
    )
