"""Pre-computed scenario return matrices for Monte Carlo simulation."""

from __future__ import annotations

from pathlib import Path

import duckdb
import numpy as np

# Fixed number of scenarios matching the column count of the parquet files.
NUM_SCENARIOS: int = 250

_NUM_AGES: int = 80

# Row 0 = age 21, row 79 = age 100.
MIN_AGE: int = 21

# Default data directory: {project_root}/data/
_DATA_DIR: Path = Path(__file__).parent.parent.parent / "data"

# Module-level singleton — loaded once, reused for every simulation.
_instance: ScenarioMatrixLoader | None = None


class ScenarioMatrixLoader:
    """Reads sim_stocks, sim_bonds, sim_cash parquet files into numpy arrays.

    Each matrix has shape (_NUM_AGES, NUM_SCENARIOS) = (80, 250).
    Row i → age MIN_AGE + i  (row 0 = age 21, row 79 = age 100).
    Column j → scenario j+1  (0-indexed; parquet column name str(j+1)).
    Values are annual real returns as decimals.
    """

    def __init__(self, data_dir: Path = _DATA_DIR) -> None:
        self.stocks: np.ndarray = self._load(data_dir / "sim_stocks.parquet")
        self.bonds: np.ndarray = self._load(data_dir / "sim_bonds.parquet")
        self.cash: np.ndarray = self._load(data_dir / "sim_cash.parquet")

    @staticmethod
    def _load(path: Path) -> np.ndarray:
        """Load a parquet file as a (_NUM_AGES, NUM_SCENARIOS) float64 array."""
        con = duckdb.connect()
        col_exprs = ", ".join(f'"{i}"' for i in range(1, NUM_SCENARIOS + 1))
        rows = con.execute(
            f"SELECT {col_exprs} FROM read_parquet('{path}')"
        ).fetchall()
        return np.array(rows, dtype=np.float64)  # shape (80, 250)


def get_default_loader() -> ScenarioMatrixLoader:
    """Return the module-level singleton, loading from _DATA_DIR on first call."""
    global _instance
    if _instance is None:
        _instance = ScenarioMatrixLoader()
    return _instance
