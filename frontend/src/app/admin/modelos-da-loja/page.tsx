import { AdminShell } from "@/features/admin/AdminShell";
import { StoreModelsCrud } from "@/features/admin/crud/StoreModelsCrud";

export default function Page() {
  return (
    <AdminShell title="Modelos da Loja">
      <StoreModelsCrud />
    </AdminShell>
  );
}
