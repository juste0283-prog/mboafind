# MboaFind 🇨🇲

Plateforme camerounaise **open source** qui permet aux citoyens de rechercher un produit,
comparer les prix proposés par différents vendeurs, localiser les commerces, trouver un
professionnel pour résoudre un problème, et donner/recevoir des avis en toute confiance.

---

## 🎯 Problème

Au Cameroun, il n'existe pas encore d'outil centralisé et fiable pour :

- savoir **où acheter** un produit au meilleur prix ;
- **comparer** les prix entre vendeurs d'une même ville ;
- **trouver** un professionnel de confiance (mécanicien, maçon, informaticien…) ;
- **consulter** la réputation d'un commerce ou d'un professionnel avant de faire confiance.

Les prix sont souvent non publiés, les informations sont éparpillées sur les réseaux sociaux,
et il n'existe **aucun mécanisme de signalement** d'informations incorrectes.

## 💡 Solution

**MboaFind** est une plateforme collaborative qui centralise :

| Besoin utilisateur             | Module MboaFind                           |
| ------------------------------ | ----------------------------------------- |
| Trouver un produit             | Catalogue de produits + recherche         |
| Connaître le meilleur prix     | Prix par commerce, comparaison            |
| Savoir où acheter              | Carte open source (Leaflet / OSM)         |
| Trouver un professionnel       | Annuaire de professionnels + services     |
| Prendre contact                | Téléphone, messages, demande de service   |
| Faire confiance                | Avis, notes, réputation                   |
| Corriger l'information         | Signalements (prix, produits, contenus)   |

## ✨ Fonctionnalités (roadmap MVP)

- [x] Architecture complète (backend + frontend + docs)
- [ ] Authentification JWT (CLIENT, COMMERÇANT, PROFESSIONNEL, ADMIN)
- [ ] Recherche produits/filtres (catégories, villes, prix)
- [ ] Comparaison de prix (prix le plus bas, disponibilité, vérification)
- [ ] Carte des commerces (OpenStreetMap + Leaflet)
- [ ] Profil professionnel + services + demandes de service
- [ ] Avis & réputation (modération)
- [ ] Signalements côté utilisateur + modération Admin

## 🧰 Stack technique

| Couche     | Technologies                                                                   |
| ---------- | ------------------------------------------------------------------------------ |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, React-Leaflet    |
| Backend    | Python, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic                            |
| Sécurité   | JWT (PyJWT), Argon2 (pwdlib), variables d'environnement, CORS                  |
| Base de données | SQLite (MVP) → PostgreSQL (production)                                   |
| Cartographie | OpenStreetMap, Leaflet, React-Leaflet                                        |
| API        | REST, préfixe `/api/v1` (évolutif vers `/api/v2`)                              |

## 🏗️ Architecture globale

```
Frontend (React + TS + Vite + Tailwind)
   │  HTTP / JSON (Axios)  ────  Bearer JWT
   ▼
Backend (FastAPI, préfixe /api/v1)
Router → Schema Pydantic → Service métier → ORM (SQLAlchemy) → Base de données
   ▼
SQLite (MVP)  →  PostgreSQL (évolution)
```

L'architecture suit une **séparation stricte des responsabilités** : les routers ne
contiennent pas de logique métier, les services concentrent les règles, les schemas
Pydantic valident les entrées/sorties, les modèles SQLAlchemy décrivent les tables.
La base de données est abstraite derrière SQLAlchemy : migrer de SQLite vers
PostgreSQL ne nécessite qu'un changement de `DATABASE_URL`.

Documentation détaillée : [docs/architecture/architecture.md](docs/architecture/architecture.md)
## 📁 Structure du projet

```
mboafind/
├── backend/
│   ├── app/
│   │   ├── main.py              # Point d'entrée FastAPI
│   │   ├── core/                # config, sécurité, dépendances (JWT, rôles)
│   │   ├── database/            # engine, Base, session / get_db
│   │   ├── models/              # Modèles SQLAlchemy (tables)
│   │   ├── schemas/             # Schémas Pydantic (validation)
│   │   ├── routers/             # Routers REST /api/v1/*
│   │   ├── services/            # Logique métier
│   │   └── utils/               # Helpers
│   ├── alembic/                 # Migrations de base de données
│   ├── tests/                   # Tests pytest
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/          # UI (common, products, stores, ...)
│   │   ├── pages/               # Pages (Home, Search, Products, ...)
│   │   ├── layouts/             # Layouts (MainLayout, ...)
│   │   ├── hooks/               # Hooks React (useAuth, ...)
│   │   ├── services/            # Appels API centralisés
│   │   ├── types/               # Types TypeScript
│   │   ├── utils/               # Fonctions utilitaires
│   │   ├── routes/              # Configuration des routes React Router
│   │   ├── context/             # Contextes React (AuthContext, ...)
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docs/
│   ├── architecture/            # architecture.md
│   ├── api/                     # api.md
│   ├── database/                # database.md
│   ├── cahier-des-charges/
│   ├── roadmap/
│   └── workflow/
├── .gitignore
├── README.md
└── LICENSE
```

## 🚀 Lancement

### Prérequis

- Python ≥ 3.11
- Node.js ≥ 18

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # Linux / macOS
pip install -r requirements.txt
copy .env.example .env          # Windows
# cp .env.example .env           # Linux / macOS
uvicorn app.main:app --reload
```

→ API : http://localhost:8000/api/v1 · Docs : http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

→ Application : http://localhost:5173

> Note : le backend crée d'abord les tables via `Base.metadata.create_all` en
> développement. Les migrations **Alembic** (`alembic revision --autogenerate`) sont
> préparées pour la production et la future migration PostgreSQL.

## 🗺️ Roadmap

1. **Phase 1 — Fondations** (en cours) : architecture, authentification, CRUD de base.
2. **Phase 2 — Produits & prix** : catalogue, catégories, comparaison de prix.
3. **Phase 3 — Localisation** : carte Leaflet, géolocalisation des commerces.
4. **Phase 4 — Professionnels & services** : annuaire, demandes, workflow de service.
5. **Phase 5 — Confiance** : avis, réputation, signalements, modération admin.
6. **Phase 6 — Production** : PostgreSQL, tests, déploiement, observabilité.

Détails : `docs/roadmap/`

## 🤝 Contribuer

1. Fork le dépôt.
2. Crée une branche : `git checkout -b feature/ma-fonctionnalite`.
3. Committez : `git commit -m "feat: description"`.
4. Poussez : `git push origin feature/ma-fonctionnalite`.
5. Ouvrez une Pull Request.

Merci de respecter les conventions de code ((Python PEP 8 / Black, TypeScript ESLint + Prettier)
et d'ajouter des tests pour toute nouvelle logique métier..

## 📄 Licence

Ce projet est sous licence **MIT** — voir [LICENSE](LICENSE.