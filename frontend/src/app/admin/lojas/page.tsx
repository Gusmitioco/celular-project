import { AdminShell } from "@/features/admin/AdminShell";
import { StoresCrud } from "@/features/admin/crud/StoresCrud";

export default function Page() {
  return (
    <AdminShell title="Lojas">
      <StoresCrud />
    </AdminShell>
  );
}
