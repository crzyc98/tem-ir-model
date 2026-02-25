"""Simulation result models — output types for the Monte Carlo engine."""

from uuid import UUID

from pydantic import BaseModel


class PercentileValues(BaseModel):
    """Percentile balance values at a single point in time."""

    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class YearSnapshot(BaseModel):
    """A single year's data point in a trajectory."""

    age: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    withdrawal: PercentileValues | None = None


class PersonaSimulationResult(BaseModel):
    """Simulation results for a single persona."""

    persona_id: UUID
    persona_name: str
    retirement_balance: PercentileValues
    annual_withdrawal: PercentileValues | None = None
    ss_annual_benefit: float = 0.0
    total_retirement_income: PercentileValues | None = None
    trajectory: list[YearSnapshot]
    total_employee_contributions: float = 0.0
    total_employer_contributions: float = 0.0
    probability_of_success: float = 1.0
    income_replacement_ratio: PercentileValues | None = None
    projected_salary_at_retirement: float = 0.0


class SimulationResponse(BaseModel):
    """Top-level simulation result returned by the API."""

    scenario_id: UUID
    num_simulations: int
    seed: int | None
    retirement_age: int
    planning_age: int
    personas: list[PersonaSimulationResult]
