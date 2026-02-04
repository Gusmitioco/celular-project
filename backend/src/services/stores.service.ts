import { prisma } from "../lib/prisma.js";
import { fixedCity } from "../lib/env.js";

export class StoresService {
  list() {
    return prisma.store.findMany({ orderBy: { name: "asc" } });
  }

  create(data: { name: string; address: string }) {
    return prisma.store.create({
      data: {
        name: data.name,
        address: data.address,
        city: fixedCity
      }
    });
  }

  update(id: string, data: { name: string; address: string }) {
    return prisma.store.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        city: fixedCity
      }
    });
  }

  remove(id: string) {
    return prisma.store.delete({ where: { id } });
  }

  async getModels(storeId: string) {
    const rows = await prisma.storeModel.findMany({
      where: { storeId },
      include: { model: { include: { brand: true } } }
    });
    return rows.map(r => r.model);
  }

  async setModels(storeId: string, modelIds: string[]) {
    await prisma.storeModel.deleteMany({ where: { storeId } });
    if (modelIds.length > 0) {
      await prisma.storeModel.createMany({
        data: modelIds.map(modelId => ({ storeId, modelId }))
      });
    }
    return this.getModels(storeId);
  }
}
