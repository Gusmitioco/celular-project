export const rotas = {
  home: () => "/",
  agendamento: {
    marca: () => "/agendamento/marca",
    modelo: () => "/agendamento/modelo",
    servicos: () => "/agendamento/servicos",
    tela: () => "/agendamento/tela",
    checkout: () => "/agendamento/checkout",
    confirmado: (orderId: string) => `/agendamento/confirmado/${orderId}`
  },
  admin: {
    dashboard: () => "/admin",
    marcas: () => "/admin/marcas",
    modelos: () => "/admin/modelos",
    servicos: () => "/admin/servicos",
    lojas: () => "/admin/lojas",
    modelosDaLoja: () => "/admin/modelos-da-loja",
    telas: () => "/admin/telas"
  }
} as const;
