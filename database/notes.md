# Database scripts

These SQL files are executed in order (00_*, 01_*, ...).

## Dev reset (Docker)
If you're using Postgres with a persistent volume, init scripts run **only when the DB is created**.
To fully re-run schema + seed:

- `docker compose down -v`
- `docker compose up --build -d`

## Seed contents
- 1 store: ConSERTE FACIL (Teixeira de Freitas)
- Multiple models (includes iPhones from the screen price list)
- Services priced for testing
- Screen replacement prices come from `16_seed_iphone_screens.sql` (per-store).

