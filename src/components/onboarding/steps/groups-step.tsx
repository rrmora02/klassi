"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";

export function GroupsStep({
  tenantId,
  onNext,
  onBack,
  onSkip,
}: {
  tenantId: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [groups, setGroups] = useState<
    { name: string; discipline: string; capacity: string }[]
  >([]);
  const [currentGroup, setCurrentGroup] = useState({
    name: "",
    discipline: "",
    capacity: "20",
  });

  const { data: disciplines } = api.disciplines.list.useQuery({ tenantId });
  const createGroup = api.groups.create.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddGroup = () => {
    if (currentGroup.name && currentGroup.discipline) {
      setGroups([...groups, currentGroup]);
      setCurrentGroup({ name: "", discipline: "", capacity: "20" });
    }
  };

  const handleRemoveGroup = (index: number) => {
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      for (const group of groups) {
        await createGroup.mutateAsync({
          tenantId,
          name: group.name,
          disciplineId: group.discipline,
          capacity: parseInt(group.capacity),
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
        <h2 className="text-2xl font-bold text-gray-900">Crea tus Grupos</h2>
        <p className="text-gray-600 mt-2">
          Agrega las clases o grupos que ofrecerás
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre del grupo
            </label>
            <input
              type="text"
              value={currentGroup.name}
              onChange={(e) =>
                setCurrentGroup({ ...currentGroup, name: e.target.value })
              }
              placeholder="Ej: Curso Básico A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Disciplina
              </label>
              <select
                value={currentGroup.discipline}
                onChange={(e) =>
                  setCurrentGroup({
                    ...currentGroup,
                    discipline: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">Selecciona...</option>
                {disciplines?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Capacidad
              </label>
              <input
                type="number"
                value={currentGroup.capacity}
                onChange={(e) =>
                  setCurrentGroup({ ...currentGroup, capacity: e.target.value })
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddGroup}
            className="w-full py-2 border-2 border-dashed border-purple-300 text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
          >
            + Agregar grupo
          </button>
        </div>

        {groups.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Grupos a crear ({groups.length})
            </p>
            <div className="space-y-2">
              {groups.map((group, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white p-3 rounded border border-green-200"
                >
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    <p className="text-gray-600">
                      👥 {group.capacity} {group.discipline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(index)}
                    className="text-green-500 hover:text-green-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            💡 Siempre puedes crear más grupos después. Por ahora, agrega los
            principales.
          </p>
        </div>
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
          onClick={onSkip}
          className="px-6 py-2 text-gray-600 font-semibold hover:text-gray-900 transition-colors"
        >
          Saltar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || groups.length === 0}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {isLoading ? "Creando..." : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
