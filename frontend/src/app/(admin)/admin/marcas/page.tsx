import { redirect } from "next/navigation";

export default function Page() {
  // Não existe CRUD de marcas no backend atual.
  // A gestão de modelos usa marcas já existentes.
  redirect("/admin/models");
}
