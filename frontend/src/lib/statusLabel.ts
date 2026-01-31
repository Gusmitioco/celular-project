export function statusLabel(status: string) {
  if (status === "created") return "Criado";
  if (status === "in_progress") return "Em andamento";
  if (status === "done") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  return status;
}
