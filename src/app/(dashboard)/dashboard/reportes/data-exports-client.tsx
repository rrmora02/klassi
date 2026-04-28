"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Download, AlertCircle } from "lucide-react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function DataExportsClient() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<string | null>(null);

  const exportStudents = api.exports.exportStudents.useMutation();
  const exportInstructors = api.exports.exportInstructors.useMutation();
  const exportGroups = api.exports.exportGroups.useMutation();
  const exportPayments = api.exports.exportPayments.useMutation();
  const exportAttendance = api.exports.exportAttendance.useMutation();

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleExport = async (type: "students" | "instructors" | "groups" | "payments" | "attendance") => {
    setLoading(type);
    try {
      let result;
      switch (type) {
        case "students":
          result = await exportStudents.mutateAsync({ month: selectedMonth, year: selectedYear });
          break;
        case "instructors":
          result = await exportInstructors.mutateAsync();
          break;
        case "groups":
          result = await exportGroups.mutateAsync();
          break;
        case "payments":
          result = await exportPayments.mutateAsync({ month: selectedMonth, year: selectedYear });
          break;
        case "attendance":
          result = await exportAttendance.mutateAsync({ month: selectedMonth, year: selectedYear });
          break;
      }
      downloadCSV(result.content, result.filename);
    } catch (error: any) {
      alert("Error al descargar: " + (error.message || "Intenta de nuevo"));
    } finally {
      setLoading(null);
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const years = Array.from({ length: 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const maxMonth = currentYear === selectedYear ? currentMonth : 12;

  const exports = [
    { type: "students", label: "Alumnos", icon: "👥", requiresMonth: true },
    { type: "instructors", label: "Instructores", icon: "👨‍🏫", requiresMonth: false },
    { type: "groups", label: "Grupos", icon: "📚", requiresMonth: false },
    { type: "payments", label: "Pagos", icon: "💳", requiresMonth: true },
    { type: "attendance", label: "Asistencia", icon: "✓", requiresMonth: true },
  ];

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 20px" }}>
        Descargar datos
      </h2>

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
            }}
          >
            {months.filter(m => m <= maxMonth).map(m => (
              <option key={m} value={m}>{MONTHS[m - 1]}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Año</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 20, padding: "12px 14px", background: "rgba(59, 130, 246, 0.10)", borderRadius: 8, border: "0.5px solid rgba(59, 130, 246, 0.2)" }}>
        <AlertCircle size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
          Los datos se descargarán en formato CSV. Puedes abrir los archivos con Excel, Google Sheets o cualquier editor de texto.
        </p>
      </div>

      {/* Botones de descarga */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {exports.map(exp => (
          <button
            key={exp.type}
            onClick={() => handleExport(exp.type as any)}
            disabled={loading !== null}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "14px 12px",
              background: loading === exp.type ? "#e5e7eb" : "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 10,
              cursor: loading === exp.type ? "wait" : "pointer",
              opacity: loading && loading !== exp.type ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (loading === null) {
                e.currentTarget.style.background = "#f3f4f6";
              }
            }}
            onMouseLeave={(e) => {
              if (loading === null) {
                e.currentTarget.style.background = "var(--color-background-secondary)";
              }
            }}
          >
            <span style={{ fontSize: 20 }}>{exp.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", textAlign: "center" }}>
              {exp.label}
            </span>
            {loading === exp.type && (
              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>Descargando...</span>
            )}
            {loading !== exp.type && (
              <Download size={14} style={{ color: "var(--color-text-secondary)" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
