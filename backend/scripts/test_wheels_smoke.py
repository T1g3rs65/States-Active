"""Smoke tests for the government wheel endpoints (in-process, no network)."""
import sys
from pathlib import Path

# Ensure backend modules are importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)


def test_wheels_config():
    r = client.get("/api/wheels/config")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    wheels = {w["id"]: w for w in data["wheels"]}
    assert set(wheels.keys()) == {"form", "subtype", "territorial", "style"}
    form_labels = [o["label"] for o in wheels["form"]["options"]]
    assert "democracy" in form_labels
    assert "autocracy" in form_labels
    assert "anocracy" in form_labels
    assert "anarchy" in form_labels
    assert "oligarchy" in form_labels
    print("test_wheels_config PASSED")


def test_wheels_config_weights_sum():
    r = client.get("/api/wheels/config")
    data = r.json()
    wheels = {w["id"]: w for w in data["wheels"]}

    form_total = sum(o["weight"] for o in wheels["form"]["options"])
    assert abs(form_total - 100.0) < 1.0, f"form weights sum {form_total}"

    for form, options in wheels["subtype"]["options"].items():
        total = sum(o["weight"] for o in options)
        assert abs(total - 100.0) < 1.0, f"subtype {form} weights sum {total}"

    terr_total = sum(o["weight"] for o in wheels["territorial"]["options"])
    assert abs(terr_total - 100.0) < 1.0, f"territorial weights sum {terr_total}"

    style_total = sum(o["weight"] for o in wheels["style"]["options"])
    assert abs(style_total - 100.0) < 1.0, f"style weights sum {style_total}"

    print("test_wheels_config_weights_sum PASSED")


def test_wheels_spin():
    r = client.post("/api/wheels/spin", json={"wheel_id": "form"})
    assert r.status_code == 401, r.text
    print("test_wheels_spin PASSED: auth required")


def test_wheels_spin_idempotent():
    from government_wheels import spin_one_wheel
    first = spin_one_wheel("form")
    again = spin_one_wheel("form", first)
    assert first["government_form"] == again["government_form"]
    print("test_wheels_spin_idempotent PASSED")


def test_wheels_spin_zythera():
    from government_wheels import spin_one_wheel
    for _ in range(20):
        form = spin_one_wheel("form", race="zythera")["government_form"]
        assert form in ("oligarchy", "autocracy"), f"Zythera rolled {form}"
    print("test_wheels_spin_zythera PASSED")


def test_wheels_config_zythera():
    r = client.get("/api/wheels/config?race=zythera")
    data = r.json()
    form_labels = {o["label"] for o in data["wheels"][0]["options"]}
    assert "democracy" not in form_labels
    assert "anocracy" not in form_labels
    assert "anarchy" not in form_labels
    print("test_wheels_config_zythera PASSED")


def test_anarchy_subtype_zythera():
    # Zythera anarchy only reachable via collapse, but the wheel table must expose it
    r = client.get("/api/wheels/config?race=zythera")
    data = r.json()
    wheels = {w["id"]: w for w in data["wheels"]}
    assert "anarchy" in wheels["subtype"]["options"], "Zythera subtype table missing anarchy"
    assert len(wheels["subtype"]["options"]["anarchy"]) == 1
    assert wheels["subtype"]["options"]["anarchy"][0]["label"] == "Hive Collapse / Swarm Anarchy"
    print("test_anarchy_subtype_zythera PASSED")


if __name__ == "__main__":
    test_wheels_config()
    test_wheels_config_weights_sum()
    test_wheels_spin()
    test_wheels_spin_idempotent()
    test_wheels_spin_zythera()
    test_wheels_config_zythera()
    test_anarchy_subtype_zythera()
    print("\nAll wheel endpoint smoke tests passed.")
