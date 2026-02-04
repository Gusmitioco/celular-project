import { Request, Response, NextFunction } from "express";
import { OrdersService } from "../services/orders.service.js";

export class OrdersController {
  private svc = new OrdersService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerName, customerWhatsapp, brandId, modelId, serviceIds } = req.body ?? {};

      if (!customerName || !customerWhatsapp || !brandId || !modelId || !Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ error: "Campos obrigatórios: customerName, customerWhatsapp, brandId, modelId, serviceIds[]" });
      }

      const order = await this.svc.create({
        customerName,
        customerWhatsapp,
        brandId,
        modelId,
        serviceIds
      });

      res.status(201).json(order);
    } catch (e) {
      next(e);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.svc.getById(id);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(order);
    } catch (e) {
      next(e);
    }
  };
}
