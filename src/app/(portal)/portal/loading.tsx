// Esqueleto instantáneo del portal (móvil) durante la navegación entre
// pestañas; las tabs inferiores persisten, solo el contenido carga.

function Bar({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: 6,
        background: "var(--color-background-primary)",
      }}
      className="animate-pulse"
    />
  );
}

export default function PortalLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-busy="true" aria-label="Cargando">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Bar w={180} h={20} />
        <Bar w={240} h={13} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Bar w="60%" h={15} />
          <Bar w="85%" h={12} />
        </div>
      ))}
    </div>
  );
}
