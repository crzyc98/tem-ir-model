"""Tests for global settings: store, endpoints, and workspace seeding."""

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from api.main import create_app
from api.models.global_defaults import GlobalDefaults
from api.storage.global_defaults_store import GlobalDefaultsStore


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture()
def tmp_base(tmp_path: Path) -> Path:
    """A temporary base directory acting as ~/.retiremodel."""
    (tmp_path / "workspaces").mkdir()
    return tmp_path


@pytest.fixture()
def store(tmp_base: Path) -> GlobalDefaultsStore:
    return GlobalDefaultsStore(tmp_base)


@pytest.fixture()
def client(tmp_base: Path) -> TestClient:
    app = create_app(tmp_base)
    return TestClient(app)


# ── T013: GlobalDefaultsStore unit tests ─────────────────────────────────────


class TestGlobalDefaultsStore:
    def test_load_returns_defaults_when_no_file(self, store: GlobalDefaultsStore) -> None:
        result = store.load()
        assert isinstance(result, GlobalDefaults)
        assert result.inflation_rate == GlobalDefaults().inflation_rate
        assert result.retirement_age == 67

    def test_save_and_reload(self, store: GlobalDefaultsStore) -> None:
        modified = GlobalDefaults(inflation_rate=0.03)
        store.save(modified)
        reloaded = store.load()
        assert reloaded.inflation_rate == pytest.approx(0.03)
        # Other fields remain at system defaults
        assert reloaded.retirement_age == 67

    def test_corrupted_yaml_falls_back_to_defaults(
        self, store: GlobalDefaultsStore, tmp_base: Path
    ) -> None:
        yaml_path = tmp_base / "global_defaults.yaml"
        yaml_path.write_text("{{{{ invalid yaml ::::", encoding="utf-8")
        result = store.load()
        assert isinstance(result, GlobalDefaults)
        assert result.inflation_rate == GlobalDefaults().inflation_rate

    def test_reset_deletes_file_and_returns_defaults(
        self, store: GlobalDefaultsStore, tmp_base: Path
    ) -> None:
        store.save(GlobalDefaults(inflation_rate=0.04))
        assert (tmp_base / "global_defaults.yaml").exists()
        result = store.reset()
        assert not (tmp_base / "global_defaults.yaml").exists()
        assert result.inflation_rate == GlobalDefaults().inflation_rate

    def test_save_creates_valid_yaml(
        self, store: GlobalDefaultsStore, tmp_base: Path
    ) -> None:
        store.save(GlobalDefaults(comp_limit=400_000))
        raw = yaml.safe_load((tmp_base / "global_defaults.yaml").read_text())
        assert raw["comp_limit"] == 400_000.0


# ── T014: Endpoint tests + workspace seeding ─────────────────────────────────


class TestGlobalSettingsEndpoints:
    def test_get_endpoint_returns_200(self, client: TestClient) -> None:
        resp = client.get("/api/v1/global-settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "inflation_rate" in data
        assert "retirement_age" in data
        assert "target_replacement_ratio_mode" in data

    def test_get_returns_system_defaults_when_no_file(self, client: TestClient) -> None:
        resp = client.get("/api/v1/global-settings")
        data = resp.json()
        assert data["inflation_rate"] == pytest.approx(GlobalDefaults().inflation_rate)
        assert data["retirement_age"] == 67

    def test_put_endpoint_saves_and_returns(
        self, client: TestClient, tmp_base: Path
    ) -> None:
        payload = GlobalDefaults(inflation_rate=0.035).model_dump()
        resp = client.put("/api/v1/global-settings", json=payload)
        assert resp.status_code == 200
        assert resp.json()["inflation_rate"] == pytest.approx(0.035)
        # Verify YAML was written
        assert (tmp_base / "global_defaults.yaml").exists()

    def test_create_workspace_uses_global_defaults(
        self, client: TestClient, tmp_base: Path
    ) -> None:
        # Save custom inflation_rate
        payload = GlobalDefaults(inflation_rate=0.03).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        # Create workspace
        resp = client.post("/api/v1/workspaces", json={"client_name": "SeededCo"})
        assert resp.status_code == 201
        ws = resp.json()
        assert ws["base_config"]["inflation_rate"] == pytest.approx(0.03)

    def test_create_workspace_iRS_limits_from_defaults(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults(comp_limit=400_000).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        resp = client.post("/api/v1/workspaces", json={"client_name": "LimitsCo"})
        assert resp.status_code == 201
        ws = resp.json()
        assert ws["base_config"]["comp_limit"] == pytest.approx(400_000)


# ── T016: Replacement ratio validation and seeding tests ─────────────────────


class TestReplacementRatioMode:
    def test_put_flat_mode_without_override_returns_422(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults().model_dump()
        payload["target_replacement_ratio_mode"] = "flat_percentage"
        payload["target_replacement_ratio_override"] = None
        resp = client.put("/api/v1/global-settings", json=payload)
        assert resp.status_code == 422

    def test_create_workspace_flat_ratio_mode(self, client: TestClient) -> None:
        payload = GlobalDefaults(
            target_replacement_ratio_mode="flat_percentage",
            target_replacement_ratio_override=0.75,
        ).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        resp = client.post("/api/v1/workspaces", json={"client_name": "FlatRatioCo"})
        assert resp.status_code == 201
        ws = resp.json()
        assert ws["base_config"]["target_replacement_ratio_override"] == pytest.approx(0.75)

    def test_create_workspace_lookup_mode_clears_override(
        self, client: TestClient
    ) -> None:
        # Default mode is lookup_table — override must be None in new workspace
        resp = client.post("/api/v1/workspaces", json={"client_name": "LookupCo"})
        assert resp.status_code == 201
        ws = resp.json()
        assert ws["base_config"]["target_replacement_ratio_override"] is None


# ── T018: Simulation defaults tests ──────────────────────────────────────────


class TestSimulationDefaults:
    def test_put_invalid_planning_age_lte_retirement_returns_422(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults().model_dump()
        payload["retirement_age"] = 67
        payload["planning_age"] = 67
        resp = client.put("/api/v1/global-settings", json=payload)
        assert resp.status_code == 422

    def test_create_workspace_applies_ss_claiming_age(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults(ss_claiming_age=65).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        resp = client.post("/api/v1/workspaces", json={"client_name": "SSCo"})
        assert resp.status_code == 201
        ws = resp.json()
        for persona in ws["personas"]:
            assert persona["ss_claiming_age"] == 65

    def test_create_workspace_applies_retirement_and_planning_age(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults(retirement_age=65, planning_age=95).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        resp = client.post("/api/v1/workspaces", json={"client_name": "AgeCo"})
        assert resp.status_code == 201
        ws = resp.json()
        assert ws["monte_carlo_config"]["retirement_age"] == 65
        assert ws["monte_carlo_config"]["planning_age"] == 95


# ── T022: Restore endpoint tests ─────────────────────────────────────────────


class TestRestoreEndpoint:
    def test_restore_endpoint_returns_system_defaults(
        self, client: TestClient, tmp_base: Path
    ) -> None:
        # Save custom settings first
        payload = GlobalDefaults(inflation_rate=0.04).model_dump()
        client.put("/api/v1/global-settings", json=payload)
        assert (tmp_base / "global_defaults.yaml").exists()

        # Restore
        resp = client.post("/api/v1/global-settings/restore")
        assert resp.status_code == 200
        data = resp.json()
        assert data["inflation_rate"] == pytest.approx(GlobalDefaults().inflation_rate)

        # File should be deleted
        assert not (tmp_base / "global_defaults.yaml").exists()

    def test_get_after_restore_returns_system_defaults(
        self, client: TestClient
    ) -> None:
        payload = GlobalDefaults(comp_limit=999_999).model_dump()
        client.put("/api/v1/global-settings", json=payload)

        client.post("/api/v1/global-settings/restore")
        resp = client.get("/api/v1/global-settings")
        assert resp.status_code == 200
        assert resp.json()["comp_limit"] == pytest.approx(GlobalDefaults().comp_limit)
