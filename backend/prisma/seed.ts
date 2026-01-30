import { PrismaClient } from "@prisma/client";
import { fixedCity } from "../src/lib/env";

const prisma = new PrismaClient();

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.storeModel.deleteMany();
  await prisma.store.deleteMany();
  await prisma.modelService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.model.deleteMany();
  await prisma.brand.deleteMany();

  const brand1 = await prisma.brand.create({
    data: { name: "Apple", slug: slugify("Apple") }
  });
  const brand2 = await prisma.brand.create({
    data: { name: "Samsung", slug: slugify("Samsung") }
  });

  const modelsApple = await prisma.model.createManyAndReturn({
    data: [
      { name: "iPhone 11", brandId: brand1.id },
      { name: "iPhone 12", brandId: brand1.id },
      { name: "iPhone 13", brandId: brand1.id }
    ]
  });

  const modelsSamsung = await prisma.model.createManyAndReturn({
    data: [
      { name: "Galaxy S21", brandId: brand2.id },
      { name: "Galaxy A52", brandId: brand2.id },
      { name: "Galaxy S22", brandId: brand2.id }
    ]
  });

  const services = await prisma.service.createManyAndReturn({
    data: [
      { name: "Troca de tela", priceCents: 45000 },
      { name: "Troca de bateria", priceCents: 22000 },
      { name: "Reparo no conector de carga", priceCents: 18000 },
      { name: "Troca de câmera", priceCents: 26000 },
      { name: "Limpeza interna", priceCents: 9000 }
    ]
  });

  // vínculos model-services (simples e funcional)
  const allModels = [...modelsApple, ...modelsSamsung];
  for (const m of allModels) {
    // regra: todos têm limpeza interna
    await prisma.modelService.create({
      data: { modelId: m.id, serviceId: services.find(s => s.name === "Limpeza interna")!.id }
    });

    // regra: alguns serviços variam
    const pick = (name: string) => services.find(s => s.name === name)!.id;

    await prisma.modelService.create({ data: { modelId: m.id, serviceId: pick("Troca de bateria") } });
    await prisma.modelService.create({ data: { modelId: m.id, serviceId: pick("Troca de tela") } });

    // metade recebe mais um
    if (m.name.includes("13") || m.name.includes("S22") || m.name.includes("A52")) {
      await prisma.modelService.create({ data: { modelId: m.id, serviceId: pick("Troca de câmera") } });
    } else {
      await prisma.modelService.create({ data: { modelId: m.id, serviceId: pick("Reparo no conector de carga") } });
    }
  }

  const store = await prisma.store.create({
    data: {
      name: "ConSERT FÁCIL - Loja 01",
      address: "Av. Exemplo, 123 - Centro",
      city: fixedCity
    }
  });

  // store-models: a loja atende 4 modelos
  const storeModelsPick = [modelsApple[0], modelsApple[1], modelsSamsung[0], modelsSamsung[1]];
  for (const m of storeModelsPick) {
    await prisma.storeModel.create({ data: { storeId: store.id, modelId: m.id } });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
