## TechFix database init

If this folder is mounted into Postgres at `/docker-entrypoint-initdb.d`, the `.sql` files run in alphabetical order **only when the database volume is empty**.

Order:
1. `00_schema.sql`
2. `01_seed.sql`
3. `02_customer_auth.sql`
4. `03_requests.sql`

If you already have data, apply new files manually with `psql -f`.
