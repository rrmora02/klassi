"use client";

import { useState, useRef, useEffect } from "react";
import { fullName } from "@/lib/utils";
import { X, Search } from "lucide-react";

export interface StudentOption {
  id:        string;
  firstName: string;
  lastName:  string;
}

interface Props {
  students:    StudentOption[];
  value:       StudentOption | null;
  onChange:    (student: StudentOption | null) => void;
  placeholder?: string;
  error?:      string;
}

export function StudentSearchPicker({ students, value, onChange, placeholder = "Buscar alumno...", error }: Props) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? students.filter(s =>
        fullName(s.firstName, s.lastName).toLowerCase().includes(query.toLowerCase()) ||
        s.lastName.toLowerCase().includes(query.toLowerCase())
      )
    : students.slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (s: StudentOption) => {
    onChange(s);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8,
    border: `1px solid ${error ? "#fca5a5" : "var(--color-border-secondary)"}`,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "var(--color-background-primary)", color: "var(--color-text-primary)",
  };

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "#d4e9e2" }}>
        <span style={{ fontSize: 14, color: "#006241", fontWeight: 500, flex: 1 }}>
          {fullName(value.firstName, value.lastName)}
        </span>
        <button
          type="button"
          onClick={clear}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
      />

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid var(--color-border-secondary)",
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          zIndex: 100, maxHeight: 220, overflowY: "auto",
        }}>
          {filtered.length === 0 ? (
            <p style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-tertiary)", margin: 0 }}>
              Sin resultados
            </p>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => select(s)}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 14px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, color: "var(--color-text-primary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  display: "flex", flexDirection: "column",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <span style={{ fontWeight: 500 }}>{fullName(s.firstName, s.lastName)}</span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
