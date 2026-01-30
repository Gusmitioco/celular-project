import { AdminShell } from "@/features/admin/AdminShell";
import { BrandsCrud } from "@/features/admin/crud/BrandsCrud";

export default function Page() {
  return (
    <AdminShell title="Marcas">
      <BrandsCrud />
    </AdminShell>
  );
}
