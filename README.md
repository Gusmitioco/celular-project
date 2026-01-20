# Projeto

Monorepo:
- `backend/` Express + TypeScript API
- `frontend/` Next.js + TypeScript UI
- `database/` schema + seed
- `docker-compose.yml` local Postgres

## Prerequisites
- Node.js (LTS recommended)
- Docker Desktop (for Postgres)

## Para o setup de gus

1) Clone + enter the folder
git clone <your-repo-url>
cd celular-project


2) Start Postgres with Docker
docker compose up -d


To confirm it’s running:
docker ps


He should see techfix_db.

If he ever needs to “reset” the database (wipe and re-seed):

docker compose down -v
docker compose up -d


3) Backend setup
cd backend
cp .env.example .env
npm install
npm run dev



Test in browser:

http://localhost:3001/api/health → should return JSON ok

http://localhost:3001/api/db-test → should return JSON with timestamp


4) Frontend setup

Open another terminal:

cd frontend
cp .env.example .env.local
npm install
npm run dev


Open:

http://localhost:3000

He should see the homepage with connected ✅.