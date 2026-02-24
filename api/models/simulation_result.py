"""Simulation result models — output types for the Monte Carlo engine."""

from uuid import UUID

from pydantic import BaseModel


class PercentileValues(BaseModel):
    """Percentile balance values at a single point in time."""

    p25: float
    p50: float
    p75: float
    p90: float


class YearSnapshot(BaseModel):
    """A single year's data point in a trajectory."""

    age: int
    p25: float
    p50: float
    p75: float
    p90: float


class PersonaSimulationResult(BaseModel):
    """Simulation results for a single persona."""

    persona_id: UUID
    persona_name: str
    retirement_balance: PercentileValues
    trajectory: list[YearSnapshot]


class SimulationResponse(BaseModel):
    """Top-level simulation result returned by the API."""

    scenario_id: UUID
    num_simulations: int
    seed: int | None
    retirement_age: int
    personas: list[PersonaSimulationResult]
