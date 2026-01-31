# ConSERTE FÁCIL — Plataforma de Assistência Técnica

Aplicação web para agendamento de serviços (Marca → Modelo → Serviços → Checkout → Confirmado), com conta do cliente (login/cadastro, Meus Pedidos, status e chat) e área administrativa.

## Visão geral
O projeto é dividido em:
- **Frontend** (Next.js + TypeScript + Tailwind): interface final do cliente.
- **Backend** (Node.js + Express + TypeScript): API, autenticação e regras de negócio.
- **Database** (PostgreSQL via Docker Compose): persistência de dados.

A cidade inicial do projeto é **Teixeira de Freitas (predefinida)** — o usuário inicia direto no fluxo de **Marca**.

---

## Stack
### Frontend
- Next.js 14
- React + TypeScript
- Tailwind CSS

### Backend
- Node.js + Express
- TypeScript
- Autenticação (sessão/cookie) e rotas para customer/admin (conforme implementação no backend)

### Database
- PostgreSQL (Docker Compose)

---

## Estrutura do repositório
```
/
├─ frontend/          # Next.js (UI)
├─ backend/           # Express API
├─ database/          # seeds/scripts (se houver)
└─ docker-compose.yml # Postgres
```

---

## Requisitos para rodar localmente
- **Node.js** (recomendado: 20+)
- **npm**
- **Docker** e **Docker Compose**
- Git

> Observação: Node 24 pode funcionar, mas um LTS (ex.: Node 20) costuma ser mais estável.

---
## Como rodar localmente (qualquer PC)

### 1) Clonar o repositório
```bash
git clone git@github.com:Gusmitioco/celular-project.git
cd celular-project
```

### 2) Subir o Postgres com Docker
Na raiz do projeto:
```bash
docker compose up -d
docker ps
```

Se der erro de container com nome já existente (ex.: `techfix_db`):
```bash
docker stop techfix_db || true
docker rm techfix_db || true
docker compose up -d
```

### 3) Variáveis de ambiente

#### Backend
Crie `backend/.env`:
```env
PORT=3001
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/techfix
```
> Ajuste usuário/senha/porta/nome do banco conforme seu `docker-compose.yml`.

#### Frontend
Crie `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4) Instalar dependências
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 5) Rodar o projeto (2 terminais)

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
Backend: `http://localhost:3001`

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
Frontend: `http://localhost:3000`

---

## Rotas principais (Frontend)
- `/` — Home
- `/agendamento/marca`
- `/agendamento/modelo`
- `/agendamento/servicos`
- `/agendamento/checkout`
- `/confirmado`
- `/login` e `/cadastro`
- `/meus-pedidos`
- `/conta` (perfil do usuário)

> Algumas páginas mudam o conteúdo dependendo se o usuário está logado (ex.: checkout e meus-pedidos).

---

## API (Backend)
Prefixo: `/api`

Exemplos:
- `GET /api/health` — status do backend
- `GET /api/brands` — lista marcas
- `GET /api/models?brandId=...` — modelos por marca
- `GET /api/services?modelId=...` — serviços por modelo
- `POST /api/requests/...` — cria pedido (a rota exata depende do backend)

---

## Solução de problemas

### Admin retornando 401 (Not authenticated)
Isso é esperado se você não estiver autenticado como admin. É preciso logar como admin conforme as rotas do backend e manter a sessão/cookie.

### Erro `42P01` (tabela não existe)
Normalmente significa banco sem seeds/migrations.

Tente resetar volumes:
```bash
docker compose down -v
docker compose up -d
```

E, se necessário, verifique tabelas:
```bash
# Ajuste o nome do container e do banco conforme seu docker-compose
docker exec -it techfix_db psql -U postgres -d techfix -c "\\dt"
```

### Login não “fica logado”
Verifique:
- No backend: CORS com `origin=http://localhost:3000` e `credentials=true`
- No frontend: requests usando `credentials: "include"` (quando o backend usa cookie)

---

## Scripts úteis

### Backend
```bash
npm run dev
npm run build
npm run start
```

### Frontend
```bash
npm run dev
npm run build
npm run start
```

---

## Próximos passos
- Estilizar áreas ainda “cruas” (admin/chat/meus pedidos detalhado, etc).
- Padronizar UX e responsividade (desktop e mobile).
- Consolidar fluxo do pedido: criação → status → chat → histórico/códigos.

---

## Licença
Projeto privado / uso interno do cliente (definir depois).
