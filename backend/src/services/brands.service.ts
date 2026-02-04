import { prisma } from "../lib/prisma.js";

export class BrandsService {
  list() {
    return prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  create(data: { name: string; slug: string }) {
    return prisma.brand.create({ data });
  }

  update(id: string, data: { name: string; slug: string }) {
    return prisma.brand.update({ where: { id }, data });
  }

  remove(id: string) {
    return prisma.brand.delete({ where: { id } });
  }
}
