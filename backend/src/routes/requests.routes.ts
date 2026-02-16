import { Router } from "express";
import crypto from "crypto";
import { pool, query } from "../db.js";
import { requireCustomer } from "../auth/customerAuth.js";
import { chatLimiter, createRequestLimiter, heavyReadLimiter, publicCodeLimiter, publicCodeSlowdown } from "../middleware/antiSpam.js";
import { emitMessage, type RealtimeMessage } from "../realtime/io.js";
import { slugify } from "../utils/slugify.js";

export const requestsRouter = Router();

const MAX_CREATED_PER_CUSTOMER = 5;

// Cache the service id for "Troca de Tela" (used as a special-case service with options)
let cachedScreenServiceId: number | null = null;
async function getScreenServiceId(): Promise<number | null> {
  if (cachedScreenServiceId != null) return cachedScreenServiceId;
  const rows = await query<{ id: number }>(
    `SELECT id FROM services WHERE name = 'Troca de Tela' LIMIT 1`
  );
  cachedScreenServiceId = rows[0]?.id ? Number(rows[0].id) : null;
  return cachedScreenServiceId;
}

async function getEffectiveScreenPriceCents(args: { storeId: number; screenOptionId: number }): Promise<number | null> {
  const rows = await query<{ price_cents: number }>(
    `
    SELECT sp.price_cents AS price_cents
    FROM screen_option_prices_store sp
    JOIN screen_options o ON o.id = sp.screen_option_id
    WHERE sp.store_id = $1
      AND sp.screen_option_id = $2
      AND o.active = TRUE
      AND sp.price_cents > 0
    LIMIT 1
    `,
    [args.storeId, args.screenOptionId]
  );
  return rows[0] ? Number(rows[0].price_cents) : null;
}

async function resolveCityNameFromSlug(citySlug: string | undefined) {
  const defaultCityName = String(process.env.DEFAULT_CITY_NAME ?? "").trim();
  const effectiveSlug = (citySlug ?? "").trim() || (defaultCityName ? slugify(defaultCityName) : "");
  if (!effectiveSlug) return null;

  const cityRows = await query<{ city: string }>(
    `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
  );
  const match =
    cityRows.find((r) => slugify(r.city) === effectiveSlug) ??
    (defaultCityName && slugify(defaultCityName) === effectiveSlug ? { city: defaultCityName } : undefined);

  return match?.city ?? null;
}

async function pickStoreForRequest(args: {
  storeId?: number;
  cityName?: string | null;
  modelId: number;
  serviceIds: number[];
  screenOptionId?: number | null;
  screenServiceId?: number | null;
}) {
  const envStoreId = Number(process.env.DEFAULT_STORE_ID ?? NaN);
  if (Number.isFinite(envStoreId)) return envStoreId;
  if (Number.isFinite(args.storeId)) return args.storeId!;

  // If we have only one store in the city, or the product is single-store, we can auto-pick.
  // We prefer the cheapest store that covers all selected services for the given model.
  const cityName = args.cityName ?? null;
  if (!cityName) return null;

  // If "Troca de Tela" is selected, the real price comes from a screen option.
  // We still want to pick the cheapest store that covers all other services and the model.
  const screenOptionId = args.screenOptionId ?? null;
  const screenServiceId = args.screenServiceId ?? null;

  if (screenOptionId && screenServiceId && args.serviceIds.includes(screenServiceId)) {
    const normalServiceIds = args.serviceIds.filter((id) => id !== screenServiceId);

    const rows = await query<{ store_id: number }>(
      `
      WITH normal AS (
        SELECT
          s.id AS store_id,
          COALESCE(SUM(p.price_cents), 0) AS normal_sum,
          COUNT(DISTINCT p.service_id) AS normal_count
        FROM stores s
        JOIN store_models sm ON sm.store_id = s.id AND sm.model_id = $2
        LEFT JOIN store_model_service_prices p
          ON p.store_id = s.id
         AND p.model_id = $2
         AND (CASE WHEN $5::bigint[] IS NULL THEN FALSE ELSE p.service_id = ANY($5::bigint[]) END)
        WHERE TRIM(s.city) = TRIM($1)
        GROUP BY s.id
      )
      SELECT
        n.store_id
      FROM normal n
      JOIN screen_options o ON o.id = $3 AND o.model_id = $2 AND o.active = TRUE
      JOIN screen_option_prices_store sp
        ON sp.screen_option_id = o.id
       AND sp.store_id = n.store_id
      WHERE n.normal_count = $4
        AND sp.price_cents > 0
      ORDER BY (n.normal_sum + sp.price_cents) ASC, n.store_id ASC
      LIMIT 1
      `,
      [cityName, args.modelId, screenOptionId, normalServiceIds.length, normalServiceIds.length ? normalServiceIds : null]
    );

    return rows[0]?.store_id ? Number(rows[0].store_id) : null;
  }

  const rows = await query<{ store_id: number }>(
    `
    SELECT s.id AS store_id
    FROM store_model_service_prices p
    JOIN stores s ON s.id = p.store_id
    WHERE TRIM(s.city) = TRIM($1)
      AND p.model_id = $2
      AND p.service_id = ANY($3::bigint[])
    GROUP BY s.id
    HAVING COUNT(DISTINCT p.service_id) = $4
    ORDER BY SUM(p.price_cents) ASC, s.id ASC
    LIMIT 1
    `,
    [cityName, args.modelId, args.serviceIds, args.serviceIds.length]
  );
  return rows[0]?.store_id ? Number(rows[0].store_id) : null;
}

function makeCode() {
  // Human-friendly short code (Crockford Base32, avoids I/L/O/U confusion)
  // Example: TFX-7K3M9P2D
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const LENGTH = 5; // change to 6 if you really want it shorter (less secure)

  // Generate enough random bytes and map 5-bit chunks to Base32 chars.
  const bytes = crypto.randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = "";

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < LENGTH) {
      const idx = (value >> (bits - 5)) & 31;
      out += ALPHABET[idx];
      bits -= 5;
    }
    if (out.length >= LENGTH) break;
  }

  // Fallback (extremely unlikely) if not enough bits consumed for LENGTH
  while (out.length < LENGTH) out += ALPHABET[crypto.randomInt(0, 32)];

  return `TFX-${out}`;
}


/**
 * Fingerprint used to avoid creating duplicate "created" requests for a customer.
 * "Duplicate" means: same store + model + EXACT same service ids set.
 *
 * We rely on parseIdArray() to give us a stable, sorted unique serviceIds list.
 * This fingerprint is stored in service_requests.created_fingerprint and enforced
 * by the partial unique index created in database/09_request_fingerprint.sql.
 */
function makeCreatedFingerprint(storeId: number, modelId: number, serviceIds: number[], screenOptionId?: number | null) {
  const extra = screenOptionId ? `|screen:${screenOptionId}` : "";
  const stable = `${storeId}|${modelId}|${serviceIds.join(",")}${extra}`;
  return crypto.createHash("sha256").update(stable).digest("hex");
}

/**
 * Parse + sanitize numeric id arrays safely.
 * Ensures TypeScript gets number[] and removes duplicates.
 */
function parseIdArray(input: unknown, max = 50): number[] {
  const raw = Array.isArray(input) ? input : [];
  const ids: number[] = raw
    .map((x) => Number(x))
    .filter((n): n is number => Number.isFinite(n));

  // unique + sorted (important for duplicate detection)
  const uniqSorted = Array.from(new Set(ids)).sort((a, b) => a - b);
  return uniqSorted.slice(0, max);
}

/**
 * POST /requests
 * body: { storeId, modelId, serviceIds: number[] }
 * auth: customer
 */
requestsRouter.post("/", requireCustomer, createRequestLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };

  const storeId = Number(req.body?.storeId);
  const modelId = Number(req.body?.modelId);
  const serviceIds = parseIdArray(req.body?.serviceIds, 50);
  const screenOptionIdRaw = req.body?.screenOptionId;

  if (!Number.isFinite(storeId)) return res.status(400).json({ ok: false, error: "storeId_invalid" });
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  if (serviceIds.length === 0) return res.status(400).json({ ok: false, error: "serviceIds_required" });
  if (serviceIds.length > 10) return res.status(400).json({ ok: false, error: "too_many_services" });

  const screenServiceId = await getScreenServiceId();
  const wantsScreen = !!(screenServiceId && serviceIds.includes(screenServiceId));
  const screenOptionId = wantsScreen ? Number(screenOptionIdRaw) : null;

  if (wantsScreen) {
    if (!Number.isFinite(screenOptionId)) return res.status(400).json({ ok: false, error: "screenOptionId_required" });

    // Ensure option belongs to model and is active
    const okOpt = await query<{ ok: boolean }>(
      `SELECT 1 as ok FROM screen_options o
       WHERE o.id = $1 AND o.model_id = $2 AND o.active = TRUE LIMIT 1`,
      [screenOptionId, modelId]
    );
    if (!okOpt[0]) return res.status(400).json({ ok: false, error: "screenOption_invalid" });
  }

  // 1) Limit how many CREATED requests user can have
  const createdCountRows = await query<{ n: number }>(
    `SELECT COUNT(*)::int as n
     FROM service_requests
     WHERE customer_id = $1 AND status = 'created'`,
    [customer.id]
  );

  const createdCount = Number(createdCountRows[0]?.n ?? 0);
  if (createdCount >= MAX_CREATED_PER_CUSTOMER) {
    return res.status(400).json({
      ok: false,
      error: "created_limit_reached",
      max: MAX_CREATED_PER_CUSTOMER,
    });
  }

  // 2) Duplicate guard: same store + model + EXACT SAME services set, only while status='created'.
  // We implement this via created_fingerprint + a partial unique index.
  const createdFingerprint = makeCreatedFingerprint(storeId, modelId, serviceIds, screenOptionId);

  // Fast-path: if an identical "created" request already exists, reuse it.
  // (If the store has already "picked" it up, status changes and this will NOT match.)
  const existingByFingerprint = await query<{ id: number; code: string; total_cents: number; currency: string }>(
    `
    SELECT id, code, total_cents, currency
    FROM service_requests
    WHERE customer_id = $1
      AND status = 'created'
      AND created_fingerprint = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [customer.id, createdFingerprint]
  );

  if (existingByFingerprint[0]) {
    return res.json({
      ok: true,
      reused: true,
      requestId: existingByFingerprint[0].id,
      code: existingByFingerprint[0].code,
      totalCents: Number(existingByFingerprint[0].total_cents ?? 0),
      currency: existingByFingerprint[0].currency ?? 'BRL',
    });
  }

  // Back-compat: older rows may not have created_fingerprint populated.
  // Fall back to an exact items-set match (same as before) for status='created'.
  const existingByItems = await query<{ id: number; code: string }>(
    `
    WITH reqs AS (
      SELECT
        r.id,
        r.code,
        array_agg(i.service_id ORDER BY i.service_id) AS services,
        MAX(i.screen_option_id) FILTER (WHERE i.service_id = $5) AS screen_option_id
      FROM service_requests r
      JOIN service_request_items i ON i.request_id = r.id
      WHERE r.customer_id = $1
        AND r.store_id = $2
        AND r.model_id = $3
        AND r.status = 'created'
      GROUP BY r.id
    )
    SELECT id, code, total_cents, currency
    FROM reqs
    WHERE services = $4::bigint[]
      AND ($5::bigint IS NULL OR screen_option_id = $6)
    LIMIT 1
    `,
    [customer.id, storeId, modelId, serviceIds, screenServiceId, screenOptionId]
  );
  if (existingByItems[0]) {
    return res.json({ ok: true, reused: true, requestId: existingByItems[0].id, code: existingByItems[0].code });
  }

  // 3) Load prices for this store+model for requested services
  const normalServiceIds = wantsScreen ? serviceIds.filter((id) => id !== screenServiceId) : serviceIds;

  const priced = await query<{ service_id: number; price_cents: number }>(
    `
    SELECT p.service_id, p.price_cents
    FROM store_model_service_prices p
    WHERE p.store_id = $1
      AND p.model_id = $2
      AND p.service_id = ANY($3::bigint[])
    `,
    [storeId, modelId, normalServiceIds]
  );

  // Ensure every requested service has a price
  const priceMap = new Map<number, number>();
  for (const r of priced) priceMap.set(Number(r.service_id), Number(r.price_cents));

  const missing = normalServiceIds.filter((id) => !priceMap.has(id));
  if (missing.length) {
    return res.status(400).json({ ok: false, error: "missing_prices", missingServiceIds: missing });
  }

  if (wantsScreen && screenServiceId && screenOptionId) {
    const screenPrice = await getEffectiveScreenPriceCents({ storeId, screenOptionId });
    if (!Number.isFinite(screenPrice)) {
      return res.status(400).json({ ok: false, error: "missing_screen_price" });
    }
    priceMap.set(screenServiceId, Number(screenPrice));
  }

  const totalCents = serviceIds.reduce((acc, sid) => acc + (priceMap.get(sid) ?? 0), 0);

  // 4) Create request + items in a transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let createdId: number | null = null;
    let code = "";

    for (let i = 0; i < 5; i++) {
      code = makeCode();
      try {
        const ins = await client.query(
          `
          INSERT INTO service_requests (code, customer_id, store_id, model_id, total_cents, currency, status, created_fingerprint)
          VALUES ($1, $2, $3, $4, $5, 'BRL', 'created', $6)
          ON CONFLICT (code) DO NOTHING
          RETURNING id
          `,
          [code, customer.id, storeId, modelId, totalCents, createdFingerprint]
        );

        if (ins.rows[0]?.id) {
          createdId = Number(ins.rows[0].id);
          break;
        }
      } catch (e: any) {
        // If the fingerprint unique index hits, reuse the existing request.
        if (String(e?.code) === '23505') {
          const dup = await client.query<{ id: number; code: string }>(
            `
            SELECT id, code
            FROM service_requests
            WHERE customer_id = $1
              AND status = 'created'
              AND created_fingerprint = $2
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [customer.id, createdFingerprint]
          );
          if (dup.rows[0]) {
            await client.query('ROLLBACK');
            return res.json({ ok: true, reused: true, requestId: Number(dup.rows[0].id), code: dup.rows[0].code });
          }
        }
        // Otherwise assume code collision (or any other transient issue) and try again.
      }
    }

    if (!createdId) {
      await client.query("ROLLBACK");
      return res.status(500).json({ ok: false, error: "code_generation_failed" });
    }

    for (const sid of serviceIds) {
      await client.query(
        `
        INSERT INTO service_request_items (request_id, service_id, price_cents, currency, screen_option_id)
        VALUES ($1, $2, $3, 'BRL', $4)
        ON CONFLICT (request_id, service_id) DO NOTHING
        `,
        [createdId, sid, priceMap.get(sid) ?? 0, wantsScreen && screenServiceId && sid === screenServiceId ? screenOptionId : null]
      );
    }

    await client.query("COMMIT");

    return res.json({
      ok: true,
      requestId: createdId,
      code,
      totalCents,
      currency: "BRL",
    });
  } catch (_e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: "request_create_failed" });
  } finally {
    client.release();
  }
});

/**
 * POST /requests/public
 * Checkout endpoint (requires customer login).
 *
 * body: { citySlug? , storeId? , modelId , serviceIds: number[] }
 * auth: customer session (required)
 */
requestsRouter.post("/public", requireCustomer, createRequestLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };

  const citySlug = String(req.body?.citySlug ?? req.query?.citySlug ?? "").trim();
  const storeIdRaw = Number(req.body?.storeId);
  const modelId = Number(req.body?.modelId);
  const serviceIds = parseIdArray(req.body?.serviceIds, 50);
  const screenOptionIdRaw = req.body?.screenOptionId;

  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });
  if (serviceIds.length === 0) return res.status(400).json({ ok: false, error: "serviceIds_required" });
  if (serviceIds.length > 10) return res.status(400).json({ ok: false, error: "too_many_services" });

  const screenServiceId = await getScreenServiceId();
  const wantsScreen = !!(screenServiceId && serviceIds.includes(screenServiceId));
  const screenOptionId = wantsScreen ? Number(screenOptionIdRaw) : null;

  if (wantsScreen) {
    if (!Number.isFinite(screenOptionId)) return res.status(400).json({ ok: false, error: "screenOptionId_required" });

    const okOpt = await query<{ ok: boolean }>(
      `SELECT 1 as ok FROM screen_options o
       WHERE o.id = $1 AND o.model_id = $2 AND o.active = TRUE LIMIT 1`,
      [screenOptionId, modelId]
    );
    if (!okOpt[0]) return res.status(400).json({ ok: false, error: "screenOption_invalid" });
  }

  // Resolve city
  const cityName = await resolveCityNameFromSlug(citySlug || undefined);
  if (!cityName) return res.status(400).json({ ok: false, error: "city_unavailable" });

  // Resolve store
  const storeId = await pickStoreForRequest({
    storeId: storeIdRaw,
    cityName,
    modelId,
    serviceIds,
    screenOptionId,
    screenServiceId,
  });
  if (!storeId) return res.status(400).json({ ok: false, error: "store_not_found_for_selection" });

  // Duplicate guard (same customer + store + model + exact services set) while status='created'.
  // IMPORTANT: run this BEFORE the "max created" check so that reusing an existing
  // request never gets blocked by the limit.
  const createdFingerprint = makeCreatedFingerprint(storeId, modelId, serviceIds, screenOptionId);

  const existingPublic = await query<{ id: number; code: string; total_cents: number; currency: string }>(
    `
    SELECT id, code, total_cents, currency
    FROM service_requests
    WHERE customer_id = $1
      AND status = 'created'
      AND created_fingerprint = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [customer.id, createdFingerprint]
  );

  if (existingPublic[0]) {
    const storeRows = await query<{ name: string; address: string; city: string }>(
      `SELECT name, address, city FROM stores WHERE id = $1 LIMIT 1`,
      [storeId]
    );
    return res.json({
      ok: true,
      reused: true,
      requestId: existingPublic[0].id,
      code: existingPublic[0].code,
      totalCents: Number(existingPublic[0].total_cents ?? 0),
      currency: existingPublic[0].currency ?? 'BRL',
      store: storeRows[0] ?? null,
    });
  }

  // Back-compat: older rows may not have created_fingerprint populated.
  // Do the exact items-set match for status='created'.
  const existingPublicByItems = await query<{ id: number; code: string; total_cents: number; currency: string }>(
    `
    WITH reqs AS (
      SELECT
        r.id,
        r.code,
        r.total_cents,
        r.currency,
        array_agg(i.service_id ORDER BY i.service_id) AS services,
        MAX(i.screen_option_id) FILTER (WHERE i.service_id = $5) AS screen_option_id
      FROM service_requests r
      JOIN service_request_items i ON i.request_id = r.id
      WHERE r.customer_id = $1
        AND r.store_id = $2
        AND r.model_id = $3
        AND r.status = 'created'
      GROUP BY r.id
    )
    SELECT id, code, total_cents, currency
    FROM reqs
    WHERE services = $4::bigint[]
      AND ($5::bigint IS NULL OR screen_option_id = $6)
    LIMIT 1
    `,
    [customer.id, storeId, modelId, serviceIds, screenServiceId, screenOptionId]
  );
  if (existingPublicByItems[0]) {
    const storeRows = await query<{ name: string; address: string; city: string }>(
      `SELECT name, address, city FROM stores WHERE id = $1 LIMIT 1`,
      [storeId]
    );
    return res.json({
      ok: true,
      reused: true,
      requestId: existingPublicByItems[0].id,
      code: existingPublicByItems[0].code,
      totalCents: Number(existingPublicByItems[0].total_cents ?? 0),
      currency: existingPublicByItems[0].currency ?? 'BRL',
      store: storeRows[0] ?? null,
    });
  }

  // Apply same guardrails as authenticated flow only when we have a customer
  if (customer?.id) {
    const createdCountRows = await query<{ n: number }>(
      `SELECT COUNT(*)::int as n
       FROM service_requests
       WHERE customer_id = $1 AND status = 'created'`,
      [customer.id]
    );

    const createdCount = Number(createdCountRows[0]?.n ?? 0);
    if (createdCount >= MAX_CREATED_PER_CUSTOMER) {
      return res.status(400).json({ ok: false, error: "created_limit_reached", max: MAX_CREATED_PER_CUSTOMER });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validate prices exist for all selected services in the chosen store
    const normalServiceIds = wantsScreen && screenServiceId
      ? serviceIds.filter((id) => id !== screenServiceId)
      : serviceIds;

    const priceRows = await client.query<{ service_id: number; price_cents: number }>(
      `
      SELECT service_id, price_cents
      FROM store_model_service_prices
      WHERE store_id = $1
        AND model_id = $2
        AND service_id = ANY($3::bigint[])
      `,
      [storeId, modelId, normalServiceIds]
    );

    if (priceRows.rowCount !== normalServiceIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "service_not_available" });
    }

    const priceMap = new Map<number, number>();
    for (const r of priceRows.rows) priceMap.set(Number(r.service_id), Number(r.price_cents));

    if (wantsScreen && screenServiceId && screenOptionId) {
      const screenPrice = await getEffectiveScreenPriceCents({ storeId, screenOptionId });
      if (!Number.isFinite(screenPrice)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "missing_screen_price" });
      }
      priceMap.set(screenServiceId, Number(screenPrice));
    }

    const totalCents = serviceIds.reduce((acc, sid) => acc + (priceMap.get(sid) ?? 0), 0);

    // Generate unique code (and enforce no duplicate "created" request via created_fingerprint)
    let code = "";
    let createdId: number | null = null;
    for (let i = 0; i < 5; i++) {
      code = makeCode();
      try {
        const ins = await client.query<{ id: number }>(
          `
          INSERT INTO service_requests (code, customer_id, store_id, model_id, total_cents, currency, status, created_fingerprint)
          VALUES ($1, $2, $3, $4, $5, 'BRL', 'created', $6)
          RETURNING id
          `,
          [code, customer?.id ?? null, storeId, modelId, totalCents, createdFingerprint]
        );
        createdId = Number(ins.rows[0]?.id ?? 0) || null;
        break;
      } catch (e: any) {
        // If the fingerprint unique index hits, reuse the existing request.
        if (String(e?.code) === '23505') {
          const dup = await client.query<{ id: number; code: string; total_cents: number; currency: string }>(
            `
            SELECT id, code, total_cents, currency
            FROM service_requests
            WHERE customer_id = $1
              AND status = 'created'
              AND created_fingerprint = $2
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [customer.id, createdFingerprint]
          );
          if (dup.rows[0]) {
            await client.query('ROLLBACK');
            const storeRows = await query<{ name: string; address: string; city: string }>(
              `SELECT name, address, city FROM stores WHERE id = $1 LIMIT 1`,
              [storeId]
            );
            return res.json({
              ok: true,
              reused: true,
              requestId: Number(dup.rows[0].id),
              code: dup.rows[0].code,
              totalCents: Number(dup.rows[0].total_cents ?? 0),
              currency: dup.rows[0].currency ?? 'BRL',
              store: storeRows[0] ?? null,
            });
          }
        }
        // Otherwise (likely code collision), try again.
      }
    }

    if (!createdId) {
      await client.query("ROLLBACK");
      return res.status(500).json({ ok: false, error: "code_generation_failed" });
    }

    for (const sid of serviceIds) {
      await client.query(
        `
        INSERT INTO service_request_items (request_id, service_id, price_cents, currency, screen_option_id)
        VALUES ($1, $2, $3, 'BRL', $4)
        ON CONFLICT (request_id, service_id) DO NOTHING
        `,
        [
          createdId,
          sid,
          priceMap.get(sid) ?? 0,
          wantsScreen && screenServiceId && sid === screenServiceId ? screenOptionId : null,
        ]
      );
    }

    // Store info for UI
    const storeRows = await client.query<{ name: string; address: string; city: string }>(
      `SELECT name, address, city FROM stores WHERE id = $1 LIMIT 1`,
      [storeId]
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      requestId: createdId,
      code,
      totalCents,
      currency: "BRL",
      store: storeRows.rows[0] ?? null,
    });
  } catch (_e) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: "request_create_failed" });
  } finally {
    client.release();
  }
});

/**
 * GET /requests/public/:code
 * Public request lookup for the confirmation screen.
 */
requestsRouter.get("/public/:code", publicCodeLimiter, publicCodeSlowdown, async (req, res) => {
  const code = String(req.params.code ?? "").trim();
  if (!code) return res.status(400).json({ ok: false, error: "code_required" });

  const rows = await query<{
    id: number;
    code: string;
    total_cents: number;
    currency: string;
    status: string;
    created_at: string;
    store_name: string;
    store_address: string;
    store_city: string;
    model_name: string;
  }>(
    `
    SELECT
      r.id, r.code, r.total_cents, r.currency, r.status, r.created_at,
      s.name AS store_name, s.address AS store_address, s.city AS store_city,
      m.name AS model_name
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    WHERE r.code = $1
    LIMIT 1
    `,
    [code]
  );

  if (!rows[0]) return res.status(404).json({ ok: false, error: "not_found" });
  return res.json({ ok: true, request: rows[0] });
});

/**
 * GET /requests/me
 * auth: customer
 */
requestsRouter.get("/me", requireCustomer, heavyReadLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };

  const rows = await query<{
    id: number;
    code: string;
    total_cents: number;
    currency: string;
    status: string;
    created_at: string;
    store_name: string;
    store_address: string;
    model_name: string;
    last_synced_at: string | null;
  }>(
    `
    SELECT
      r.id, r.code, r.total_cents, r.currency, r.status, r.created_at, r.last_synced_at,
      s.name AS store_name, s.address AS store_address,
      m.name AS model_name
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    WHERE r.customer_id = $1
    ORDER BY r.created_at DESC
    `,
    [customer.id]
  );

  res.json({ ok: true, rows });
});

/**
 * GET /requests/me/:code
 * auth: customer
 */
requestsRouter.get("/me/:code", requireCustomer, heavyReadLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };
  const code = String(req.params.code ?? "").trim().toUpperCase();

  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const headerRows = await query<{
    id: number;
    code: string;
    total_cents: number;
    currency: string;
    status: string;
    created_at: string;
    last_synced_at: string | null;
    store_name: string;
    store_address: string;
    model_name: string;
  }>(
    `
    SELECT
      r.id, r.code, r.total_cents, r.currency, r.status, r.created_at, r.last_synced_at,
      s.name AS store_name, s.address AS store_address,
      m.name AS model_name
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    WHERE r.customer_id = $1
      AND r.code = $2
    LIMIT 1
    `,
    [customer.id, code]
  );

  const header = headerRows[0];
  if (!header) return res.status(404).json({ ok: false, error: "not_found" });

  const items = await query<{
    service_id: number;
    service_name: string;
    price_cents: number;
    currency: string;
    screen_option_id: number | null;
    screen_option_label: string | null;
  }>(
    `
    SELECT
      i.service_id,
      sv.name AS service_name,
      i.price_cents,
      i.currency,
      i.screen_option_id,
      o.label AS screen_option_label
    FROM service_request_items i
    JOIN services sv ON sv.id = i.service_id
    LEFT JOIN screen_options o ON o.id = i.screen_option_id
    WHERE i.request_id = $1
    ORDER BY sv.name
    `,
    [header.id]
  );

  res.json({ ok: true, header, items });
});

/**
 * DELETE /requests/me/:code
 * auth: customer
 * Only if status='created'
 */
requestsRouter.delete("/me/:code", requireCustomer, async (req, res) => {
  const customer = (req as any).customer as { id: number };
  const code = String(req.params.code ?? "").trim().toUpperCase();

  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rows = await client.query(
      `SELECT id, status FROM service_requests WHERE customer_id = $1 AND code = $2 LIMIT 1`,
      [customer.id, code]
    );

    const r = rows.rows[0];
    if (!r) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    if (r.status !== "created") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "cannot_delete_status" });
    }

    const requestId = Number(r.id);

    // delete children first, then request
    await client.query(`DELETE FROM request_messages WHERE request_id = $1`, [requestId]);
    await client.query(`DELETE FROM service_request_items WHERE request_id = $1`, [requestId]);
    await client.query(`DELETE FROM service_requests WHERE id = $1 AND customer_id = $2`, [requestId, customer.id]);

    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (_e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: "delete_failed" });
  } finally {
    client.release();
  }
});

/**
 * GET /requests/me/:code/messages
 * auth: customer
 * Chat is available when status is: in_progress | done | cancelled
 */
requestsRouter.get("/me/:code/messages", requireCustomer, heavyReadLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };
  const code = String(req.params.code ?? "").trim().toUpperCase();

  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const reqRows = await query<{ id: number; status: string; customer_messages_blocked: boolean | null }>(
    `SELECT id, status, customer_messages_blocked
     FROM service_requests
     WHERE customer_id = $1 AND code = $2
     LIMIT 1`,
    [customer.id, code]
  );

  const r = reqRows[0];
  if (!r) return res.status(404).json({ ok: false, error: "not_found" });

  if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
    return res.status(403).json({ ok: false, error: "chat_locked", status: r.status });
  }

  if (r.customer_messages_blocked) {
    return res.status(403).json({ ok: false, error: "customer_messages_blocked" });
  }

  const rows = await query<{
    id: number;
    sender_type: string;
    sender_id: number | null;
    message: string;
    created_at: string;
  }>(
    `
    SELECT id, sender_type, sender_id, message, created_at
    FROM request_messages
    WHERE request_id = $1
    ORDER BY created_at ASC
    LIMIT 200
    `,
    [r.id]
  );

  res.json({ ok: true, rows });
});

/**
 * POST /requests/me/:code/messages
 * auth: customer
 * body: { message: string }
 * Chat is available when status is: in_progress | done | cancelled
 */
requestsRouter.post("/me/:code/messages", requireCustomer, chatLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };
  const code = String(req.params.code ?? "").trim().toUpperCase();

  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const message = String(req.body?.message ?? "").trim();
  if (!message) return res.status(400).json({ ok: false, error: "message_required" });
  if (message.length > 1000) return res.status(400).json({ ok: false, error: "message_too_long" });

  const reqRows = await query<{ id: number; status: string; customer_messages_blocked: boolean | null }>(
    `
    SELECT id, status, customer_messages_blocked
    FROM service_requests
    WHERE customer_id = $1 AND code = $2
    LIMIT 1
    `,
    [customer.id, code]
  );

  const r = reqRows[0];
  if (!r) return res.status(404).json({ ok: false, error: "not_found" });

  if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
    return res.status(403).json({ ok: false, error: "chat_locked", status: r.status });
  }

  if (r.customer_messages_blocked) {
    return res.status(403).json({ ok: false, error: "customer_messages_blocked" });
  }

  const inserted = await query<{ id: number }>(
    `
    INSERT INTO request_messages (request_id, sender_type, sender_id, message)
    VALUES ($1, 'customer', $2, $3)
    RETURNING id
    `,
    [r.id, customer.id, message]
  );

  // Emit realtime event (best-effort)
  const msg = await query<RealtimeMessage>(
    `
    SELECT id, request_id, sender_type, sender_id, message, created_at
    FROM request_messages
    WHERE id = $1
    LIMIT 1
    `,
    [inserted[0].id]
  );
  if (msg[0]) emitMessage(msg[0]);

  res.json({ ok: true, id: inserted[0].id });
});

/**
 * GET /requests/me/:code/syncs
 */
requestsRouter.get("/me/:code/syncs", requireCustomer, heavyReadLimiter, async (req, res) => {
  const customer = (req as any).customer as { id: number };
  const code = String(req.params.code ?? "").trim().toUpperCase();

  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const reqRows = await query<{ id: number }>(
    `SELECT id FROM service_requests WHERE customer_id = $1 AND code = $2 LIMIT 1`,
    [customer.id, code]
  );

  const requestId = reqRows[0]?.id;
  if (!requestId) return res.status(404).json({ ok: false, error: "not_found" });

  const rows = await query<{
    id: number;
    target: string;
    status: string;
    http_status: number | null;
    created_at: string;
  }>(
    `
    SELECT id, target, status, http_status, created_at
    FROM service_request_syncs
    WHERE request_id = $1
    ORDER BY created_at DESC
    LIMIT 30
    `,
    [requestId]
  );

  res.json({ ok: true, rows });
});
