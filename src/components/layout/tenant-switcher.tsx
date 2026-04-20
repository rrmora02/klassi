"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
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
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="max-w-[120px] truncate">
          {activeTenant?.name ?? "Seleccionar escuela"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {/* Menú desplegable */}
      <div className="absolute left-0 top-full mt-1 hidden w-64 flex-col rounded-xl border border-gray-100 bg-white p-1 shadow-lg group-hover:flex">
        {tenants.map(t => (
          <button
            key={t.id}
            onClick={() => handleSwitch(t.id)}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <span className="truncate">{t.name}</span>
            {t.id === activeTenantId && <Check className="h-4 w-4 text-violet-600" />}
          </button>
        ))}
        <div className="my-1 h-px bg-gray-100" />
        <button 
          onClick={() => router.push("/onboarding")}
          className="flex items-center px-3 py-2 text-left text-sm text-violet-600 hover:bg-violet-50 hover:text-violet-700 rounded-lg"
        >
          + Agregar otra escuela
        </button>
      </div>
    </div>
  );
}
