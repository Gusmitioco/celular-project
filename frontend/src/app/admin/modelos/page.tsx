import { AdminShell } from "@/features/admin/AdminShell";
import { ModelsCrud } from "@/features/admin/crud/ModelsCrud";

export default function Page() {
  return (
    <AdminShell title="Modelos">
      <ModelsCrud />
    </AdminShell>
  );
}
