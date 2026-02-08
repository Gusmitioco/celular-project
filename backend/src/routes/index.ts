import { Router } from "express";
import { citiesRouter } from "./cities.routes.ts";
import { brandsRouter } from "./brands.routes.ts";
import { modelsRouter } from "./models.routes.ts";
import { servicesRouter } from "./services.routes.ts";
import { storesRouter } from "./stores.routes.ts";
import { adminAuthRouter } from "./adminAuth.routes.ts";
import { adminPricesRouter } from "./adminPrices.routes";
import { adminStoresRouter } from "./adminStores.routes";
import { adminServicesRouter } from "./adminServices.routes";
import { adminModelsRouter } from "./adminModels.routes";
import { adminStoreModelsRouter } from "./adminStoreModels.routes";
import { authRouter } from "./auth.routes";
import { requestsRouter } from "./requests.routes";
import { adminRequestsRouter } from "./adminRequests.routes";
import { storeAuthRouter } from "./storeAuth.routes";
import { storeRequestsRouter } from "./storeRequests.routes";
import { storeInboxRouter } from "./storeInbox.routes";
import { adminSecurityRouter } from "./adminSecurity.routes";
import { storePricesRouter } from "./storePrices.routes.ts";
import { screenOptionsRouter } from "./screenOptions.routes.ts";
import { adminScreenOptionsRouter } from "./adminScreenOptions.routes.ts";
import { storeScreenPricesRouter } from "./storeScreenPrices.routes.ts";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "techfix-backend" });
});

// Dev-only endpoint (avoid exposing DB introspection in production)
if (process.env.NODE_ENV !== "production") {
  apiRouter.get("/db-test", async (_req, res, next) => {
    try {
      const { query } = await import("../db/index.ts");
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

// keep auth router last under /admin to avoid accidental shadowing
apiRouter.use("/admin", adminAuthRouter);
