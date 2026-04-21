"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Menu } from "lucide-react";

interface Props {
  sidebar: React.ReactNode;
  topbar:  React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ sidebar, topbar, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-sb-warm dark:bg-sb-house">

      {/* ── Desktop sidebar ─────────────────────────────── */}
      <div className="hidden md:flex md:w-60 md:flex-shrink-0">
        {sidebar}
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-end border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* ── Main column ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar row — includes hamburger on mobile */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(true)}
            className="flex h-16 w-14 flex-shrink-0 items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* TopBar fills the rest */}
          <div className="flex-1 min-w-0">
            {topbar}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}
