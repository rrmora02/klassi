// Esqueleto instantáneo durante la navegación: sin este archivo el clic
// queda "muerto" hasta que el servidor termina de renderizar la página.
// Solo se muestra en el área de contenido; sidebar y topbar persisten.

function Bar({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: 6,
        background: "var(--color-background-secondary)",
      }}
      className="animate-pulse"
    />
  );
}

export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }} aria-busy="true" aria-label="Cargando">
      <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <Bar w={220} h={22} />
        <Bar w={320} h={13} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <Bar w={90} h={12} />
            <Bar w={60} h={24} />
          </div>
        ))}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Bar key={i} w="100%" h={16} />
        ))}
      </div>
    </div>
  );
}
