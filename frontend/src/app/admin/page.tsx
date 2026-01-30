import { Card } from "@/components/ui/Card";
import { AdminShell } from "@/features/admin/AdminShell";

export default function Page() {
  return (
    <AdminShell title="Dashboard">
      <Card>
        <div className="font-bold">Admin do ConSERT FÁCIL</div>
        <p className="text-sm text-dracula-subtext mt-2">
          Use o menu para gerenciar marcas, modelos, serviços, lojas e associações.
        </p>
      </Card>
    </AdminShell>
  );
}
