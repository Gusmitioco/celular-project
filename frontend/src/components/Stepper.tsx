const STEPS = ["Cidade", "Marca", "Modelo", "Serviços", "Assistência"] as const;

export function Stepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;

        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`step ${done ? "stepDone" : ""} ${active ? "stepActive" : ""}`}>
              <div className="dot">{done ? "✓" : i + 1}</div>
              <div
                style={{
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--primary)" : "var(--muted)",
                }}
              >
                {label}
              </div>
            </div>

            {i < STEPS.length - 1 && <div className={`line ${done ? "lineDone" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
