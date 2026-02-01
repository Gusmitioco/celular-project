export type CityItem = {
  city: string;
  slug: string;
};

export type BrandItem = {
  brand: string;
  slug: string;
};

export type ModelItem = {
  id: number;
  model: string;
};

export type ServiceItem = {
  id: number;
  service: string;
  minPriceCents: number;
  maxPriceCents: number;
  storeCount: number;
  currency: string;
};
