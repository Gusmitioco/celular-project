import { Router } from "express";
import { citiesRouter } from "./cities.routes.ts";
import { brandsRouter } from "./brands.routes.ts";
import { modelsRouter } from "./models.routes.ts";
import { servicesRouter } from "./services.routes.ts";
import { storesRouter } from "./stores.routes.ts";



export const apiRouter = Router();


apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "techfix-backend" });
});

apiRouter.get("/db-test", async (_req, res, next) => {
  try {
    const { query } = await import("../db/index.ts");
    const rows = await query<{ now: string }>("select now() as now");
    res.json({ ok: true, now: rows[0]?.now });
  } catch (e) {
    next(e);
  }
});

apiRouter.use("/cities", citiesRouter);
apiRouter.use("/brands", brandsRouter);
apiRouter.use("/models", modelsRouter);
apiRouter.use("/services", servicesRouter);
apiRouter.use("/stores", storesRouter);


