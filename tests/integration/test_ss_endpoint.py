"""Integration tests for the standalone SS estimate endpoint."""

from uuid import uuid4

from fastapi.testclient import TestClient

from api.main import create_app


def _create_workspace(client: TestClient) -> dict:
    """Create a workspace and return the response JSON."""
    resp = client.post("/api/v1/workspaces", json={"client_name": "TestCo"})
    assert resp.status_code == 201
    return resp.json()


class TestSSEstimateEndpoint:
    def test_estimate_all_8_default_personas(self):
        """SC-005: POST returns estimates for all 8 default personas."""
        app = create_app(base_path=None)
        with TestClient(app) as client:
            ws = _create_workspace(client)
            workspace_id = ws["id"]

            resp = client.post(f"/api/v1/workspaces/{workspace_id}/ss-estimate")
            assert resp.status_code == 200
            data = resp.json()
            assert data["workspace_id"] == workspace_id
            assert len(data["estimates"]) == 8

            # All estimates should have positive AIME and monthly benefit
            for est in data["estimates"]:
                assert est["aime"] >= 0
                assert est["monthly_benefit_today"] >= 0
                assert est["annual_benefit_today"] >= 0
                assert est["claiming_age"] == 67  # all defaults

    def test_filtered_persona_ids(self):
        """Filtered persona_ids returns only requested personas."""
        app = create_app(base_path=None)
        with TestClient(app) as client:
            ws = _create_workspace(client)
            workspace_id = ws["id"]
            persona_ids = [ws["personas"][0]["id"], ws["personas"][1]["id"]]

            resp = client.post(
                f"/api/v1/workspaces/{workspace_id}/ss-estimate",
                json={"persona_ids": persona_ids},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert len(data["estimates"]) == 2
            returned_ids = {e["persona_id"] for e in data["estimates"]}
            assert returned_ids == set(persona_ids)

    def test_404_for_nonexistent_workspace(self):
        app = create_app(base_path=None)
        with TestClient(app) as client:
            fake_id = str(uuid4())
            resp = client.post(f"/api/v1/workspaces/{fake_id}/ss-estimate")
            assert resp.status_code == 404

    def test_404_for_nonexistent_persona_id(self):
        app = create_app(base_path=None)
        with TestClient(app) as client:
            ws = _create_workspace(client)
            workspace_id = ws["id"]
            fake_persona = str(uuid4())

            resp = client.post(
                f"/api/v1/workspaces/{workspace_id}/ss-estimate",
                json={"persona_ids": [fake_persona]},
            )
            assert resp.status_code == 404

    def test_response_matches_schema(self):
        """Response matches SSEstimateResponse schema."""
        app = create_app(base_path=None)
        with TestClient(app) as client:
            ws = _create_workspace(client)
            workspace_id = ws["id"]

            resp = client.post(f"/api/v1/workspaces/{workspace_id}/ss-estimate")
            data = resp.json()

            assert "workspace_id" in data
            assert "estimates" in data
            for est in data["estimates"]:
                assert "persona_id" in est
                assert "persona_name" in est
                assert "claiming_age" in est
                assert "monthly_benefit_today" in est
                assert "annual_benefit_today" in est
                assert "pia_monthly" in est
                assert "claiming_adjustment_factor" in est
                assert "aime" in est
