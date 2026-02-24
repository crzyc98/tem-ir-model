"""IRS limit warning model — structured warnings from IRS contribution limit validation."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class IrsLimitWarning(BaseModel):
    """A structured warning from IRS contribution limit validation."""

    type: Literal["employer_additions_limit", "employee_deferral_limit"]
    message: str
    persona_id: UUID | None = None
    persona_name: str | None = None
    limit_name: str
    limit_value: float
    computed_value: float
    year: int | None = None
