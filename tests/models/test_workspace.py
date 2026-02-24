"""Tests for the Workspace model."""

from datetime import datetime
from uuid import UUID

import pytest

from api.models import Workspace, Assumptions, MonteCarloConfig


class TestWorkspaceDefaults:
    def test_auto_generated_uuid(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert isinstance(w.id, UUID)

    def test_auto_populated_created_at(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert isinstance(w.created_at, datetime)

    def test_auto_populated_updated_at(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert isinstance(w.updated_at, datetime)

    def test_default_empty_personas_list(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert w.personas == []

    def test_default_assumptions_instance(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert isinstance(w.base_config, Assumptions)

    def test_default_monte_carlo_config_instance(self):
        w = Workspace(name="Test Workspace", client_name="Test Client")
        assert isinstance(w.monte_carlo_config, MonteCarloConfig)
