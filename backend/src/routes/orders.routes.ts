import { Router } from "express";
import { OrdersController } from "../controllers/orders.controller";

export const pedidosRoutes = Router();
const c = new OrdersController();

pedidosRoutes.post("/", c.create);
pedidosRoutes.get("/:id", c.getById);
