import Link from "next/link";
import { AdminMe } from "@/components/AdminMe";

export default function AdminHome() {
  return (
    <main className="container">
      <h1 className="h2">Admin</h1>
      <AdminMe />

      <div className="surface" style={{ padding: 16, marginTop: 14 }}>
        <div className="grid">
          <Link className="cardLink" href="/admin/stores">
            <div>
              <div className="cardTitle">Lojas</div>
              <div className="cardMeta">Cadastrar e editar lojas</div>
            </div>
            <div className="chev">›</div>
          </Link>

          {/* ✅ NEW */}
          <Link className="cardLink" href="/admin/requests">
            <div>
              <div className="cardTitle">Requests</div>
              <div className="cardMeta">Ver e gerenciar solicitações (códigos gerados)</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/prices">
            <div>
              <div className="cardTitle">Preços</div>
              <div className="cardMeta">Editar preços por modelo e serviço</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/telas">
            <div>
              <div className="cardTitle">Telas</div>
              <div className="cardMeta">Opções e preço padrão de troca de tela</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/services">
            <div>
              <div className="cardTitle">Serviços</div>
              <div className="cardMeta">Cadastrar e editar tipos de reparo</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/models">
            <div>
              <div className="cardTitle">Modelos</div>
              <div className="cardMeta">Cadastrar e editar modelos por marca</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/store-models">
            <div>
              <div className="cardTitle">Modelos por loja</div>
              <div className="cardMeta">Definir quais modelos cada loja atende</div>
            </div>
            <div className="chev">›</div>
          </Link>

          <Link className="cardLink" href="/admin/security">
            <div>
              <div className="cardTitle">Killswitch</div>
              <div className="cardMeta">desloga uma ou todas as lojas</div>
            </div>
            <div className="chev">›</div>
          </Link>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link className="btn" href="/admin/login">
            Logout
          </Link>
        </div>
      </div>
    </main>
  );
}
