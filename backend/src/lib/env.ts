import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT || 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  DATABASE_URL: required("DATABASE_URL"),
  FIXED_CITY: process.env.FIXED_CITY || "Teixeira de Freitas"
};

export const fixedCity = env.FIXED_CITY;
