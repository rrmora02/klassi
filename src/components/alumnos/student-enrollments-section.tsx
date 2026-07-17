"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EnrollToGroupModal } from "./enroll-to-group-modal";
import { TransferGroupModal } from "./transfer-group-modal";
import { formatDate } from "@/lib/utils";

interface Enrollment {
  id: string;
  discount: number;
  startDate: Date;
  group: {
    id: string;
    name: string;
    discipline: {
      name: string;
    };
    instructor?: {
      user: {
        name: string;
      };
    } | null;
  };
}

interface Props {
  studentId: string;
  activeEnrollments: Enrollment[];
}

export function StudentEnrollmentsSection({ studentId, activeEnrollments }: Props) {
  const router = useRouter();
  const [key, setKey] = useState(0);

  const handleEnrollSuccess = () => {
    router.refresh();
    // Force re-render to update the enrollments list
    setKey(prev => prev + 1);
  };

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Inscripciones activas</h2>
        <EnrollToGroupModal studentId={studentId} onEnrollSuccess={handleEnrollSuccess} />
      </div>
      {activeEnrollments.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sin inscripciones activas</p>
      )}
      {activeEnrollments.map(e => (
        <div key={e.id} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ background: "#d4e9e2", color: "#006241", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>{e.group.discipline.name}</span>
              <p style={{ fontWeight: 500, fontSize: 13, margin: "4px 0 0" }}>{e.group.name}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                {e.group.instructor?.user.name ?? "Sin instructor"} · Desde {formatDate(e.startDate)}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {e.discount > 0 && (
                <span style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderRadius: 20, padding: "2px 8px", fontSize: 11 }}>{e.discount}% desc.</span>
              )}
              <TransferGroupModal studentId={studentId} currentEnrollmentId={e.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
