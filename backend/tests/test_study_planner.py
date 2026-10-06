import pytest


@pytest.fixture()
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "test.db"))

    from app.core.config import get_settings

    get_settings.cache_clear()

    import app.db.database as db_module

    db_module._settings = get_settings()
    db_module._local = __import__("threading").local()

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c

    get_settings.cache_clear()


def test_generate_plan_parses_llm_json(client, monkeypatch):
    async def fake_complete(messages):
        return (
            "Here is your plan:\n"
            '[{"day_number": 1, "subject": "DBMS", "task": "Normalization basics"},'
            ' {"day_number": 1, "subject": "OS", "task": "Process scheduling"},'
            ' {"day_number": 2, "subject": "DBMS", "task": "Transactions"}]'
        )

    import app.api.routes.study_planner as sp_module

    monkeypatch.setattr(sp_module, "complete", fake_complete)

    resp = client.post(
        "/api/study-planner",
        json={"goal": "Clear semester exams", "subjects": ["DBMS", "OS"], "hours_per_day": 2, "days": 5},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["tasks"]) == 3
    assert body["tasks"][0]["subject"] == "DBMS"

    plan_id = body["id"]

    fetched = client.get(f"/api/study-planner/{plan_id}")
    assert fetched.status_code == 200
    assert len(fetched.json()["tasks"]) == 3

    task_id = body["tasks"][0]["id"]
    updated = client.patch(f"/api/study-planner/tasks/{task_id}", json={"done": True})
    assert updated.status_code == 200

    deleted = client.delete(f"/api/study-planner/{plan_id}")
    assert deleted.status_code == 200


def test_generate_plan_rejects_bad_json(client, monkeypatch):
    async def fake_complete(messages):
        return "Sorry, I can't help with that."

    import app.api.routes.study_planner as sp_module

    monkeypatch.setattr(sp_module, "complete", fake_complete)

    resp = client.post(
        "/api/study-planner",
        json={"goal": "Test", "subjects": ["Math"], "hours_per_day": 1, "days": 3},
    )
    assert resp.status_code == 502
