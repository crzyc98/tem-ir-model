"""Tests for default_personas() factory function (FR-010, US4)."""

from api.models import Persona, TargetDateAllocation, default_personas


class TestDefaultPersonas:
    def test_exactly_eight_returned(self):
        """US4-1: Exactly 8 personas returned."""
        personas = default_personas()
        assert len(personas) == 8

    def test_expected_names(self):
        personas = default_personas()
        names = [p.name for p in personas]
        assert names == [
            "Jordan", "Priya", "Marcus", "Sarah",
            "David", "Michelle", "Robert", "Linda",
        ]

    def test_age_range(self):
        personas = default_personas()
        ages = [p.age for p in personas]
        assert min(ages) == 25
        assert max(ages) == 58

    def test_salary_range(self):
        personas = default_personas()
        salaries = [p.salary for p in personas]
        assert min(salaries) == 40_000
        assert max(salaries) == 210_000

    def test_all_target_date_allocations(self):
        """US4-2: All personas use target-date allocations."""
        personas = default_personas()
        for p in personas:
            assert isinstance(p.allocation, TargetDateAllocation)

    def test_vintage_range(self):
        """US4-2: Vintages span 2035-2065."""
        personas = default_personas()
        vintages = [p.allocation.target_date_vintage for p in personas]
        assert min(vintages) == 2035
        assert max(vintages) == 2065

    def test_all_pass_revalidation(self):
        """All personas pass Pydantic re-validation."""
        personas = default_personas()
        for p in personas:
            revalidated = Persona.model_validate(p.model_dump())
            assert revalidated.name == p.name

    def test_all_include_social_security(self):
        personas = default_personas()
        for p in personas:
            assert p.include_social_security is True
