# Readmission Factors API

FastAPI service for authentication, case assignments, and annotation persistence.

## Run locally

```bash
docker compose up -d   # from repo root
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: `GET http://127.0.0.1:8000/health`

## Import data

From repository root:

```bash
python backend/scripts/import_parquet.py
```

## Key routes

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | — |
| GET | `/auth/me` | Bearer |
| GET | `/readmission/queue` | Bearer |
| GET | `/readmission/cases/{row_id}` | Bearer |
| PUT | `/readmission/cases/{row_id}/annotation` | Bearer |
| POST | `/readmission/cases/{row_id}/submit` | Bearer |
| POST | `/admin/assignments` | Admin |
| POST | `/admin/assign-all-to-reviewer` | Admin |
