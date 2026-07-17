"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, Lock, AlertCircle } from "lucide-react";
import { switchTenantAction } from "./actions";

interface Tenant {
  id:            string;
  name:          string;
  isOwned:       boolean; // createdByUserId === current user
  isChild:       boolean; // parentTenantId !== null
  isBlocked?:    boolean; // blockChildWrites === true
  blockReason?:  string;  // blockChildWritesReason
  parentName?:   string;  // nombre del parent si es child
}

export function TenantSwitcher({
  tenants,
  activeTenantId,
  userRole = "RECEPTIONIST",
  canAddSchool = false,
}: {
  tenants:        Tenant[];
  activeTenantId: string | null;
  userRole?:      string;
  canAddSchool?:  boolean;
}) {
  const router                      = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen]          = useState(false);
  const containerRef                 = useRef<HTMLDivElement>(null);

  const activeTenant = tenants.find(t => t.id === activeTenantId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSwitch = (id: string) => {
    startTransition(async () => {
      await switchTenantAction(id);
      router.refresh();
    });
    setIsOpen(false);
  };

  if (tenants.length === 0) return null;

  // Separar escuelas propias de las que fue invitado
  const ownedTenants  = tenants.filter(t => t.isOwned);
  const guestTenants  = tenants.filter(t => !t.isOwned);

  const renderTenant = (t: Tenant) => (
    <div key={t.id} className="relative group">
      <button
        onClick={() => handleSwitch(t.id)}
        title={t.isBlocked ? t.blockReason : undefined}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm w-full transition-colors ${
          t.isBlocked
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
            : "text-gray-800 dark:text-sb-light hover:bg-gray-50 dark:hover:bg-sb-house"
        }`}
      >
        <div className="flex-1 truncate">
          <span className="truncate">{t.name}</span>
          {t.isChild && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Escuela secundaria {t.parentName && `de ${t.parentName}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {t.isBlocked && (
            <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
          )}
          {t.id === activeTenantId && <Check className="h-4 w-4 text-sb-accent dark:text-sb-light" />}
        </div>
      </button>
      {t.isBlocked && (
        <div className="hidden group-hover:block absolute left-full ml-2 top-0 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
          {t.blockReason || "Solo lectura"}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        disabled={isPending}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.15)] px-3 py-2 text-sm font-medium text-gray-700 dark:text-sb-light hover:bg-gray-50 dark:hover:bg-sb-house disabled:opacity-50"
      >
        <Building2 className="h-4 w-4 text-gray-500 dark:text-sb-light/60" />
        <span className="max-w-[120px] truncate">
          {activeTenant?.name ?? "Seleccionar escuela"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-sb-light/60" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 flex flex-col rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.12)] bg-white dark:bg-sb-uplift p-1 shadow-lg z-50">

          {/* Escuelas propias */}
          {ownedTenants.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Tus escuelas
              </p>
              {ownedTenants.map(renderTenant)}
            </>
          )}

          {/* Escuelas donde fue invitado */}
          {guestTenants.length > 0 && (
            <>
              {ownedTenants.length > 0 && (
                <div className="my-1 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.10)]" />
              )}
              <p className="px-3 pt-2 pb-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Invitado
              </p>
              {guestTenants.map(renderTenant)}
            </>
          )}

          {/* Botón agregar escuela (solo ADMIN) */}
          {userRole === "ADMIN" && (
            <>
              <div className="my-1 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.10)]" />
              {canAddSchool ? (
                <button
                  onClick={() => { router.push("/onboarding"); setIsOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-left text-sm text-sb-accent dark:text-sb-light hover:bg-sb-light/30 dark:hover:bg-sb-house rounded-lg"
                >
                  + Agregar otra escuela
                </button>
              ) : (
                <div
                  title="Tu plan no permite más escuelas. Actualiza a Enterprise para agregar hasta 5."
                  className="flex items-center justify-between px-3 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed rounded-lg"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Agregar otra escuela
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    Enterprise
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
