import { prisma } from "../lib/prisma.js";

export class ModelsService {
  list(filters: { brandId?: string }) {
    return prisma.model.findMany({
      where: filters.brandId ? { brandId: filters.brandId } : undefined,
      include: { brand: true },
      orderBy: { name: "asc" }
    });
  }

  create(data: { name: string; brandId: string }) {
    return prisma.model.create({ data });
  }

  update(id: string, data: { name: string; brandId: string }) {
    return prisma.model.update({ where: { id }, data });
  }

  remove(id: string) {
    return prisma.model.delete({ where: { id } });
  }

  async getServices(modelId: string) {
    const rows = await prisma.modelService.findMany({
      where: { modelId },
      include: { service: true }
    });
    return rows.map(r => r.service);
  }

  async setServices(modelId: string, serviceIds: string[]) {
    // replace all
    await prisma.modelService.deleteMany({ where: { modelId } });
    if (serviceIds.length > 0) {
      await prisma.modelService.createMany({
        data: serviceIds.map(serviceId => ({ modelId, serviceId }))
      });
    }
    return this.getServices(modelId);
  }
}
