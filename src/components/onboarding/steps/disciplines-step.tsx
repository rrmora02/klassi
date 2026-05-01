"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";

const SUGGESTED_DISCIPLINES = [
  { name: "Matemáticas", color: "#3B82F6", icon: "🧮" },
  { name: "Lenguaje", color: "#8B5CF6", icon: "📖" },
  { name: "Ciencias", color: "#10B981", icon: "🔬" },
  { name: "Historia", color: "#F59E0B", icon: "📜" },
  { name: "Educación Física", color: "#EF4444", icon: "⚽" },
  { name: "Arte", color: "#EC4899", icon: "🎨" },
  { name: "Música", color: "#06B6D4", icon: "🎵" },
  { name: "Inglés", color: "#6366F1", icon: "🗣️" },
];

export function DisciplinesStep({
  tenantId,
  onNext,
  onBack,
}: {
  tenantId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const createDiscipline = api.disciplines.create.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleAddCustom = () => {
    if (custom.trim()) {
      setSelected((prev) => [...prev, custom.trim()]);
      setCustom("");
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      for (const name of selected) {
        const discipline = SUGGESTED_DISCIPLINES.find((d) => d.name === name);
        await createDiscipline.mutateAsync({
          tenantId,
          name,
          color: discipline?.color || "#6B7280",
        });
      }
      onNext();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Crea tus Disciplinas
        </h2>
        <p className="text-gray-600 mt-2">
          Selecciona las áreas que ofreces o agrega las tuyas
        </p>
      </div>

      <div className="space-y-6">
        {/* Suggested disciplines */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUGGESTED_DISCIPLINES.map((discipline) => (
            <button
              key={discipline.name}
              onClick={() => handleSelect(discipline.name)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                selected.includes(discipline.name)
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">{discipline.icon}</div>
              <p className="text-xs font-semibold text-gray-700">
                {discipline.name}
              </p>
            </button>
          ))}
        </div>

        {/* Custom discipline */}
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddCustom()}
            placeholder="Agregar otra disciplina..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Agregar
          </button>
        </div>

        {/* Selected disciplines list */}
        {selected.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Disciplinas seleccionadas ({selected.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.map((name) => (
                <div
                  key={name}
                  className="bg-white border border-purple-300 rounded-full px-3 py-1 text-sm text-gray-700 flex items-center gap-2"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => handleSelect(name)}
                    className="text-purple-500 hover:text-purple-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || selected.length === 0}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {isLoading ? "Creando..." : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
