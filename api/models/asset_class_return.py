"""AssetClassReturn model — structured return/risk per asset class."""

from pydantic import BaseModel, Field


class AssetClassReturn(BaseModel):
    """Expected return and standard deviation for an asset class."""

    expected_return: float
    standard_deviation: float = Field(ge=0.0)
