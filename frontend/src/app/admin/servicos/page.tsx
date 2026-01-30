import { AdminShell } from "@/features/admin/AdminShell";
import { ServicesCrud } from "@/features/admin/crud/ServicesCrud";

export default function Page() {
  return (
    <AdminShell title="Serviços">
      <ServicesCrud />
    </AdminShell>
  );
}
