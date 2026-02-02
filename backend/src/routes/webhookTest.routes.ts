import { Router } from "express";
import crypto from "crypto";

export const webhookTestRouter = Router();

/**
 * POST /webhook/test
 * Receives webhook payloads and verifies X-TechFix-Signature (sha256 HMAC)
 *
 * Set WEBHOOK_TEST_SECRET in backend .env to verify signatures.
 * For safety, if not set the endpoint will refuse requests.
 */
webhookTestRouter.post("/test", async (req, res) => {
  const secret = process.env.WEBHOOK_TEST_SECRET || "";
  const sig = String(req.header("X-TechFix-Signature") ?? "");
  const body = req.body; // needs express.json()

  if (!secret) {
    return res.status(500).json({ ok: false, error: "WEBHOOK_TEST_SECRET_not_configured" });
  }

  if (!sig) {
    return res.status(400).json({ ok: false, error: "missing_signature" });
  }

  const payloadStr = JSON.stringify(body);

  const expected = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
  const verified = timingSafeEqualHex(expected, sig);

  if (!verified) {
    return res.status(401).json({ ok: false, error: "invalid_signature" });
  }

  // Log only in development to avoid leaking payloads into prod logs.
  if (process.env.NODE_ENV !== "production") {
    const MAX_LOG = 2000;
    console.log("---- WEBHOOK RECEIVED /webhook/test ----");
    console.log("verified:", verified);
    console.log("payload:", payloadStr.length > MAX_LOG ? payloadStr.slice(0, MAX_LOG) + "..." : payloadStr);
  }

  // reply
  res.json({
    ok: true,
    verified,
    receivedEvent: body?.event ?? null,
  });
});

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
