# TechFix

Monorepo:
- `backend/` Express + TypeScript API
- `frontend/` Next.js + TypeScript UI
- `database/` schema + seed
- `docker-compose.yml` local Postgres

## Prerequisites
- Node.js (LTS recommended)
- Docker Desktop (for Postgres)

## 1) Start the database (Postgres)
From repo root:

```bash
docker compose up -d
