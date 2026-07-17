"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventInvitationPreview } from "./event-invitation-preview";

interface Group {
  id: string;
  name: string;
}

interface CreateEventFormProps {
  groups: Group[];
}

export function CreateEventForm({ groups }: CreateEventFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isSchoolWide: true,
    groupIds: [] as string[],
    date: "",
    amount: "",
    dueDate: "",
  });

  const createMutation = api.events.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "El nombre del evento es requerido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.date) {
        toast({
          title: "Error",
          description: "La fecha del evento es requerida",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.amount) {
        toast({
          title: "Error",
          description: "El monto es requerido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.dueDate) {
        toast({
          title: "Error",
          description: "La fecha límite de pago es requerida",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.isSchoolWide && formData.groupIds.length === 0) {
        toast({
          title: "Error",
          description: "Selecciona al menos un grupo",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Crear evento
      const result = await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        date: new Date(formData.date + "T00:00:00"),
        isSchoolWide: formData.isSchoolWide,
        groupIds: formData.isSchoolWide ? [""] : formData.groupIds, // dummy si es school-wide
        amount: Math.round(parseFloat(formData.amount) * 100), // convertir a centavos
        dueDate: new Date(formData.dueDate + "T00:00:00"),
      });

      toast({
        title: "Evento creado",
        description: `${formData.name} ha sido creado exitosamente`,
      });

      router.push(`/dashboard/eventos/${result.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No pudimos crear el evento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData((prev) => {
      const newGroupIds = prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId];
      return { ...prev, groupIds: newGroupIds };
    });
  };

  const groupNames = formData.isSchoolWide
    ? ["Toda la escuela"]
    : groups
        .filter((g) => formData.groupIds.includes(g.id))
        .map((g) => g.name);

  const previewDate = formData.date ? new Date(formData.date + "T00:00:00") : new Date();
  const previewDueDate = formData.dueDate ? new Date(formData.dueDate + "T00:00:00") : new Date();
  const previewAmount = formData.amount ? Math.round(parseFloat(formData.amount) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre del evento */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Nombre del evento
        </label>
        <input
          type="text"
          placeholder="Ej: Día del Niño, Convivio, Cumpleaños"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Descripción (opcional)
        </label>
        <textarea
          placeholder="Detalles adicionales sobre el evento..."
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
          className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
        />
      </div>

      {/* Tipo de evento */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          ¿A quién va dirigido?
        </label>

        <div className="space-y-3">
          {/* Toda la escuela */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors" style={{
            borderColor: formData.isSchoolWide ? "#006241" : "#e5e7eb",
            backgroundColor: formData.isSchoolWide
              ? "rgba(0, 98, 65, 0.05)"
              : "transparent",
          }}>
            <input
              type="radio"
              name="eventType"
              checked={formData.isSchoolWide}
              onChange={() =>
                setFormData((prev) => ({ ...prev, isSchoolWide: true }))
              }
              className="w-4 h-4 accent-sb-green"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Toda la escuela
              </p>
              <p className="text-xs text-gray-500 dark:text-sb-light/60">
                El evento es para todos los alumnos activos
              </p>
            </div>
          </label>

          {/* Grupos específicos */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-colors" style={{
            borderColor: !formData.isSchoolWide ? "#006241" : "#e5e7eb",
            backgroundColor: !formData.isSchoolWide
              ? "rgba(0, 98, 65, 0.05)"
              : "transparent",
          }}>
            <input
              type="radio"
              name="eventType"
              checked={!formData.isSchoolWide}
              onChange={() =>
                setFormData((prev) => ({ ...prev, isSchoolWide: false }))
              }
              className="w-4 h-4 accent-sb-green"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Grupos específicos
              </p>
              <p className="text-xs text-gray-500 dark:text-sb-light/60">
                Solo para los grupos que selecciones
              </p>
            </div>
          </label>
        </div>

        {/* Selección de grupos */}
        {!formData.isSchoolWide && (
          <div className="mt-4 space-y-2 pl-7">
            {groups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-sb-light/60">
                No hay grupos disponibles
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.groupIds.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="w-4 h-4 rounded accent-sb-green"
                    />
                    <span className="text-sm text-gray-700 dark:text-sb-light/80">
                      {group.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fecha del evento */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Fecha del evento
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
          className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house px-4 py-2.5 text-gray-900 dark:text-gray-100 outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
        />
      </div>

      {/* Monto a cobrar */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Monto a cobrar por alumno
        </label>
        <div className="mt-2 relative">
          <span className="absolute left-4 top-2.5 text-gray-500 dark:text-sb-light/60">
            $
          </span>
          <input
            type="number"
            placeholder="500.00"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, amount: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house pl-8 pr-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-sb-light/60">
          Este monto se cobrará a cada alumno seleccionado
        </p>
      </div>

      {/* Fecha límite de pago */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Fecha límite de pago
        </label>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
          }
          className="mt-2 w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house px-4 py-2.5 text-gray-900 dark:text-gray-100 outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-sb-light/60">
          Antes de esta fecha deben confirmar y pagar
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-[rgba(255,255,255,0.10)]">
        <Link
          href="/dashboard/eventos"
          className="flex-1 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-4 py-2.5 text-center font-medium text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-sb-accent hover:bg-sb-green disabled:bg-sb-accent/50 px-4 py-2.5 text-center font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            "Crear evento"
          )}
        </button>
      </div>
    </form>

      {/* Preview */}
      <div className="sticky top-20">
        <EventInvitationPreview
          eventName={formData.name || "Nombre del evento"}
          description={formData.description || undefined}
          date={previewDate}
          groupNames={groupNames}
          amount={previewAmount}
          dueDate={previewDueDate}
        />
      </div>
    </div>
  );
}
