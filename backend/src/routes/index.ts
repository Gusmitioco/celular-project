import { Router } from "express";
import { citiesRouter } from "./cities.routes.js";
import { brandsRouter } from "./brands.routes.js";
import { modelsRouter } from "./models.routes.js";
import { servicesRouter } from "./services.routes.js";
import { storesRouter } from "./stores.routes.js";
import { adminAuthRouter } from "./adminAuth.routes.js";
import { adminPricesRouter } from "./adminPrices.routes.js";
import { adminStoresRouter } from "./adminStores.routes.js";
import { adminServicesRouter } from "./adminServices.routes.js";
import { adminModelsRouter } from "./adminModels.routes.js";
import { adminStoreModelsRouter } from "./adminStoreModels.routes.js";
import { authRouter } from "./auth.routes.js";
import { requestsRouter } from "./requests.routes.js";
import { adminRequestsRouter } from "./adminRequests.routes.js";
import { storeAuthRouter } from "./storeAuth.routes.js";
import { storeRequestsRouter } from "./storeRequests.routes.js";
import { storeInboxRouter } from "./storeInbox.routes.js";
import { adminSecurityRouter } from "./adminSecurity.routes.js";
import { storePricesRouter } from "./storePrices.routes.js";
import { screenOptionsRouter } from "./screenOptions.routes.js";
import { adminScreenOptionsRouter } from "./adminScreenOptions.routes.js";
import { storeScreenPricesRouter } from "./storeScreenPrices.routes.js";
import { adminScreenPricesRouter } from "./adminScreenPrices.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "techfix-backend" });
});

// Dev-only endpoint (avoid exposing DB introspection in production)
if (process.env.NODE_ENV !== "production") {
  apiRouter.get("/db-test", async (_req, res, next) => {
    try {
      const { query } = await import("../db/index.js");
      const rows = await query<{ now: string }>("select now() as now");
      res.json({ ok: true, now: rows[0]?.now });
    } catch (e) {
      next(e);
    }
  });
}

apiRouter.use("/cities", citiesRouter);
apiRouter.use("/brands", brandsRouter);
apiRouter.use("/models", modelsRouter);
apiRouter.use("/services", servicesRouter);
apiRouter.use("/screen-options", screenOptionsRouter);
apiRouter.use("/stores", storesRouter);

apiRouter.use("/auth", authRouter);
apiRouter.use("/requests", requestsRouter);

apiRouter.use("/store-auth", storeAuthRouter);
apiRouter.use("/store/requests", storeRequestsRouter);
apiRouter.use("/store/inbox", storeInboxRouter);
apiRouter.use("/store/prices", storePricesRouter);
apiRouter.use("/store/screen-prices", storeScreenPricesRouter);

apiRouter.use("/admin/prices", adminPricesRouter);
apiRouter.use("/admin/stores", adminStoresRouter);
apiRouter.use("/admin/services", adminServicesRouter);
apiRouter.use("/admin/models", adminModelsRouter);
apiRouter.use("/admin/store-models", adminStoreModelsRouter);
apiRouter.use("/admin/requests", adminRequestsRouter);
apiRouter.use("/admin/security", adminSecurityRouter);
apiRouter.use("/admin/screen-options", adminScreenOptionsRouter);
apiRouter.use("/admin/screen-prices", adminScreenPricesRouter);

// keep auth router last under /admin to avoid accidental shadowing
apiRouter.use("/admin", adminAuthRouter);
