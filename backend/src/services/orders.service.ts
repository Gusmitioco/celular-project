import { prisma } from "../lib/prisma";
import { fixedCity } from "../lib/env";

export class OrdersService {
  async create(input: {
    customerName: string;
    customerWhatsapp: string;
    brandId: string;
    modelId: string;
    serviceIds: string[];
  }) {
    // carregar serviços (preço) para salvar orderItems e total
    const services = await prisma.service.findMany({
      where: { id: { in: input.serviceIds } }
    });

    if (services.length !== input.serviceIds.length) {
      throw new Error("Um ou mais serviços inválidos");
    }

    const totalCents = services.reduce((acc, s) => acc + s.priceCents, 0);

    const order = await prisma.order.create({
      data: {
        customerName: input.customerName,
        customerWhatsapp: input.customerWhatsapp,
        city: fixedCity,
        brandId: input.brandId,
        modelId: input.modelId,
        totalCents,
        items: {
          create: services.map(s => ({
            serviceId: s.id,
            priceCents: s.priceCents
          }))
        }
      },
      include: {
        items: { include: { service: true } },
        brand: true,
        model: true
      }
    });

    return order;
  }

  getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { service: true } },
        brand: true,
        model: true
      }
    });
  }
}
