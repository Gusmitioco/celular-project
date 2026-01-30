import { prisma } from "../lib/prisma";

export class ServicesService {
  list() {
    return prisma.service.findMany({ orderBy: { name: "asc" } });
  }

  create(data: { name: string; priceCents: number }) {
    return prisma.service.create({ data });
  }

  update(id: string, data: { name: string; priceCents: number }) {
    return prisma.service.update({ where: { id }, data });
  }

  remove(id: string) {
    return prisma.service.delete({ where: { id } });
  }
}
