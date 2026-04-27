"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check } from "lucide-react";
import { switchTenantAction } from "./actions";

interface Tenant {
  id: string;
  name: string;
}

export function TenantSwitcher({
  tenants,
  activeTenantId,
  userRole = "RECEPTIONIST"
}: {
  tenants: Tenant[];
  activeTenantId: string | null;
  userRole?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const activeTenant = tenants.find(t => t.id === activeTenantId);

  const handleSwitch = (id: string) => {
    startTransition(async () => {
      await switchTenantAction(id);
      router.refresh();
    });
    setIsOpen(false);
  };

  if (tenants.length === 0) return null;

  return (
    <div className="relative" onMouseLeave={() => setIsOpen(false)}>
      <button
        disabled={isPending}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.15)] px-3 py-2 text-sm font-medium text-gray-700 dark:text-sb-light hover:bg-gray-50 dark:hover:bg-sb-house disabled:opacity-50"
      >
        <Building2 className="h-4 w-4 text-gray-500 dark:text-sb-light/60" />
        <span className="max-w-[120px] truncate">
          {activeTenant?.name ?? "Seleccionar escuela"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-sb-light/60" />
      </button>

      {/* Menú desplegable */}
      <div className={`absolute left-0 top-full mt-1 w-64 flex-col rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.12)] bg-white dark:bg-sb-uplift p-1 shadow-lg ${isOpen ? 'flex' : 'hidden'}`}>
        {tenants.map(t => (
          <button
            key={t.id}
            onClick={() => handleSwitch(t.id)}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-800 dark:text-sb-light hover:bg-gray-50 dark:hover:bg-sb-house"
          >
            <span className="truncate">{t.name}</span>
            {t.id === activeTenantId && <Check className="h-4 w-4 text-sb-accent dark:text-sb-light" />}
          </button>
        ))}
        {userRole === "ADMIN" && (
          <>
            <div className="my-1 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.10)]" />
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center px-3 py-2 text-left text-sm text-sb-accent dark:text-sb-light hover:bg-sb-light/30 dark:hover:bg-sb-house hover:text-sb-accent rounded-lg"
            >
              + Agregar otra escuela
            </button>
          </>
        )}
      </div>
    </div>
  );
}
