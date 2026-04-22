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

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-sb-light dark:border-sb-uplift bg-sb-light/40 dark:bg-sb-uplift px-3 py-2">
        <span className="flex-1 text-sm font-medium text-sb-green dark:text-sb-light">
          {fullName(value.firstName, value.lastName)}
        </span>
        <button
          type="button"
          onClick={clear}
          className="flex items-center p-0.5 text-gray-400 dark:text-sb-light/50 hover:text-gray-600 dark:hover:text-sb-light border-none bg-transparent cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-sb-light/50"
      />
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full rounded-lg border bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent ${
          error
            ? "border-red-300 dark:border-red-500"
            : "border-gray-200 dark:border-[rgba(255,255,255,0.20)]"
        }`}
      />

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.15)] bg-white dark:bg-sb-uplift shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-gray-400 dark:text-sb-light/50 m-0">
              Sin resultados
            </p>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => select(s)}
                className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 border-none border-b border-gray-50 dark:border-[rgba(255,255,255,0.07)] bg-transparent cursor-pointer hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
              >
                {fullName(s.firstName, s.lastName)}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
