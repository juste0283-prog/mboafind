# MboaFind — Backend (FastAPI)

API REST de la plateforme MboaFind, développée avec FastAPI, Pydantic v2,
SQLAlchemy 2 et Alembic. Base SQLite en développement, PostgreSQL en production.

## Démarrage rapide

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate    # Linux / macOS
pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env         # Linux / macOS
uvicorn app.main:app --reload
```

Documentation interactive : http://localhost:8000/docs

## Structure

```
app/
├── main.py            # Point d'entrée FastAPI (CORS, routers, health check)
├── core/              # Config centrale, sécurité (JWT + Argon2), dépendances/rôles
├── database/          # Engine, Base déclarative, session (get_db)
├── models/            # Modèles SQLAlchemy (users, stores, products, prices, ...)
├── schemas/           # Schémas Pydantic (Create / Update / Read)
├── routers/           # Routers REST sous /api/v1
├── services/          # Logique métier (auth, search, price, store, ...)
└── utils/             # Helpers
```

## Migrations (Alembic)

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

En développement, les tables sont créées automatiquement au démarrage ;
en production, utiliser exclusivement Alembic.

## Tests

```bash
pytest
```