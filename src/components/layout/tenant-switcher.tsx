"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { switchTenantAction } from "./actions";

interface Tenant {
  id: string;
  name: string;
}

export function TenantSwitcher({
  tenants,
  activeTenantId
}: {
  tenants: Tenant[];
  activeTenantId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeTenant = tenants.find(t => t.id === activeTenantId);

  const handleSwitch = (id: string) => {
    startTransition(async () => {
      await switchTenantAction(id);
      router.refresh();
    });
  };

  if (tenants.length === 0) return null;

  return (
    <div className="relative group">
      <button
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
        style={{
          border: "1px solid var(--color-border-secondary)",
          background: "#fff",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <Building2 className="h-3.5 w-3.5 text-gray-400" />
        <span className="max-w-[140px] truncate text-[13px]">
          {activeTenant?.name ?? "Seleccionar escuela"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {/* Menú desplegable */}
      <div
        className="absolute left-0 top-full mt-1.5 hidden w-64 flex-col rounded-xl p-1.5 group-hover:flex"
        style={{
          background: "#fff",
          border: "1px solid var(--color-border-secondary)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          zIndex: 50,
        }}
      >
        <p
          style={{
            padding: "4px 10px 6px",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-tertiary)",
          }}
        >
          Mis escuelas
        </p>
        {tenants.map(t => (
          <button
            key={t.id}
            onClick={() => handleSwitch(t.id)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
            style={{ color: "var(--color-text-primary)" }}
          >
            <span className="truncate text-[13px]">{t.name}</span>
            {t.id === activeTenantId && (
              <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
            )}
          </button>
        ))}
        <div
          style={{
            margin: "6px 0",
            height: 1,
            background: "var(--color-border-tertiary)",
          }}
        />
        <button
          onClick={() => router.push("/onboarding")}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50"
          style={{ color: "var(--color-primary)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-[13px] font-medium">Agregar otra escuela</span>
        </button>
      </div>
    </div>
  );
}
