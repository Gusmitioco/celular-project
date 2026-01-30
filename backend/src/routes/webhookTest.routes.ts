import { Router } from "express";
import crypto from "crypto";

export const webhookTestRouter = Router();

/**
 * POST /webhook/test
 * Receives webhook payloads and verifies X-TechFix-Signature (sha256 HMAC)
 *
 * Set WEBHOOK_TEST_SECRET in backend .env to verify signatures.
 * If not set, it will still accept and log payloads.
 */
webhookTestRouter.post("/test", async (req, res) => {
  const secret = process.env.WEBHOOK_TEST_SECRET || "";
  const sig = String(req.header("X-TechFix-Signature") ?? "");
  const body = req.body; // needs express.json()

  const payloadStr = JSON.stringify(body);

  let verified = false;
  if (secret && sig) {
    const expected = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
    verified = timingSafeEqualHex(expected, sig);
  }

  // Log what arrived
  console.log("---- WEBHOOK RECEIVED /webhook/test ----");
  console.log("signature:", sig || "(none)");
  console.log("verified:", secret ? verified : "(no WEBHOOK_TEST_SECRET set)");
  console.log("payload:", payloadStr);

  // reply
  res.json({
    ok: true,
    verified: secret ? verified : null,
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
