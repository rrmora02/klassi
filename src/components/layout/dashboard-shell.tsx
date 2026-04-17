"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

interface Props {
  topbar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ topbar, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "#f8fafc" }}>

      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Close button inside drawer */}
        <div style={{ position: "absolute", top: 16, right: -44, zIndex: 51 }}>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} color="#fff" />
            </button>
          )}
        </div>
        <Sidebar />
      </div>

      {/* ── Main content area ── */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Topbar + mobile hamburger */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {/* Hamburger button — mobile only */}
          <button
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            style={{
              height: 64, width: 56, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              background: "transparent", border: "none", cursor: "pointer",
              borderRight: "1px solid var(--color-border-tertiary)",
            }}
            aria-label="Abrir menú"
          >
            <Menu size={20} style={{ color: "var(--color-text-primary)" }} />
          </button>

          {/* TopBar fills the rest */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {topbar}
          </div>
        </div>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ minWidth: 0 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
