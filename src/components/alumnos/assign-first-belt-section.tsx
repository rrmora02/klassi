"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

interface Props {
  studentId: string;
  studentName: string;
}

export function AssignFirstBeltSection({ studentId, studentName }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedBelt, setSelectedBelt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const updateBelt = api.students.updateBeltColor.useMutation();

  const belts = [
    { value: "WHITE", label: "⚪ Blanca", description: "Nivel inicial" },
    { value: "YELLOW", label: "🟡 Amarilla", description: "Primer grado" },
    { value: "ORANGE", label: "🟠 Naranja", description: "Segundo grado" },
    { value: "GREEN", label: "🟢 Verde", description: "Tercer grado" },
    { value: "BLUE", label: "🔵 Azul", description: "Cuarto grado" },
    { value: "BROWN", label: "🟤 Marrón", description: "Quinto grado" },
    { value: "BLACK", label: "⚫ Negra", description: "Cinturón negro" },
  ];

  const handleAssign = async () => {
    if (!selectedBelt) return;

    setIsLoading(true);
    try {
      await updateBelt.mutateAsync({
        studentId,
        beltColor: selectedBelt as any,
      });

      toast({
        title: "Cinta asignada",
        description: `${studentName} ahora es ${belts.find(b => b.value === selectedBelt)?.label}`,
      });

      // Actualizar la página para mostrar la sección de cinta en lugar del selector
      router.refresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No pudimos asignar la cinta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-background-primary)", border: "2px dashed #00754A", borderRadius: 12, padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#00754A", margin: "0 0 4px" }}>🥋 Asignar Primera Cinta</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Selecciona la cinta inicial para {studentName}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        {belts.map(belt => (
          <div
            key={belt.value}
            onClick={() => setSelectedBelt(belt.value)}
            style={{
              padding: "12px 10px",
              borderRadius: 8,
              border: `2px solid ${selectedBelt === belt.value ? "#00754A" : "var(--color-border-secondary)"}`,
              background: selectedBelt === belt.value ? "#d4e9e2" : "var(--color-background-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
            }}
            onMouseOver={(e) => {
              if (selectedBelt !== belt.value) {
                e.currentTarget.style.borderColor = "#00754A";
              }
            }}
            onMouseOut={(e) => {
              if (selectedBelt !== belt.value) {
                e.currentTarget.style.borderColor = "var(--color-border-secondary)";
              }
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>
              {belt.label.split(" ")[0]}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
              {belt.label.split(" ")[1]}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAssign}
        disabled={!selectedBelt || isLoading}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: selectedBelt ? "#00754A" : "var(--color-background-secondary)",
          color: selectedBelt ? "#fff" : "var(--color-text-tertiary)",
          cursor: selectedBelt && !isLoading ? "pointer" : "not-allowed",
          fontWeight: 500,
          fontSize: 13,
          opacity: !selectedBelt || isLoading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        {isLoading ? "Guardando..." : "Asignar cinta"}
      </button>
    </div>
  );
}
