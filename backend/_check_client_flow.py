"""Script de validation manuelle du flux client (a supprimer ensuite)."""

from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)

r = c.get("/api/v1/products", params={"search": "ssd"})
print("recherche globale:", r.status_code, r.json()["total"], "produit(s)")
pid = r.json()["items"][0]["id"]
r = c.get(f"/api/v1/products/{pid}")
b = r.json()
print("fiche produit:", b["name"], "| min", b["min_price"], "| offres", len(b["offers"]))
sid = b["offers"][0]["store_id"]
r = c.get(f"/api/v1/stores/{sid}")
print("fiche boutique:", r.json()["name"], "| avis", r.json()["rating_count"])
r = c.get("/api/v1/professionals", params={"search": "telephone"})
print("professionnels:", r.status_code, r.json()["total"])
r = c.get("/api/v1/categories")
print("categories:", r.status_code, len(r.json()))

r = c.post(
    "/api/v1/auth/login",
    json={"email": "client@demo.mboafind", "password": "demo123456"},
)
assert r.status_code == 200, r.text
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}
print("login client demo OK")

price_id = b["offers"][1]["id"]
r = c.post(f"/api/v1/prices/{price_id}/confirm", headers=h)
print("confirmation prix:", r.status_code, r.json()["message"])

prof = c.get("/api/v1/professionals", params={"search": "telephone"}).json()["items"][0]
pro_detail = c.get(f"/api/v1/professionals/{prof['id']}").json()
svc = pro_detail["services"][0]["id"]
r = c.post(
    "/api/v1/service-requests",
    headers=h,
    json={"service_id": svc, "message": "Test"},
)
print(
    "demande de service:",
    r.status_code,
    r.json()["status"],
    "->",
    r.json()["service_name"],
)
srv_list = c.get("/api/v1/service-requests", headers=h)
print("mes demandes:", srv_list.json()["total"])
my_reviews = c.get("/api/v1/reviews/mine", headers=h)
print("mes avis:", my_reviews.json()["total"])

r = c.post(
    "/api/v1/reports",
    headers=h,
    json={
        "target_type": "STORE",
        "target_id": sid,
        "reason": "Localisation incorrecte",
    },
)
print("signalement:", r.status_code, r.json()["status"])