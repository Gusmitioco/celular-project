import "./store.css";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storeShell">
      <div className="storeContainer">{children}</div>
    </div>
  );
}
