export type Brand = {
  id: string;
  name: string;
  slug: string;
};

export type Model = {
  id: string;
  name: string;
  brandId: string;
  brand?: Brand;
};

export type Service = {
  id: string;
  name: string;
  priceCents: number;
};

export type Store = {
  id: string;
  name: string;
  address: string;
  city: string;
};

export type OrderItem = {
  id: string;
  serviceId: string;
  priceCents: number;
  service?: Service;
};

export type Order = {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  city: string;
  brandId: string;
  modelId: string;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};
