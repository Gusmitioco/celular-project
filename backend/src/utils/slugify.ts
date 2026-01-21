export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .replace(/\s+/g, "-")         // spaces -> dashes
    .replace(/-+/g, "-");         // collapse dashes
}
