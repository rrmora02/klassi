"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";
import Link from "next/link";
import { EventInvitationPreview } from "./event-invitation-preview";

interface EditEventFormProps {
  eventId: string;
  initialData: {
    name: string;
    description?: string;
    date: Date;
    paymentDueDate?: Date;
    amount: number;
    status: string;
  };
}

export function EditEventForm({ eventId, initialData }: EditEventFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData.name,
    description: initialData.description || "",
    date: initialData.date.toISOString().split("T")[0],
    paymentDueDate: initialData.paymentDueDate?.toISOString().split("T")[0] || "",
    amount: (initialData.amount / 100).toString(),
  });

  const updateMutation = api.events.update.useMutation();
  const deleteMutation = api.events.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      if (formData.paymentDueDate && new Date(formData.paymentDueDate) > new Date(formData.date)) {
        toast({
          title: "Error",
          description: "La fecha de pago no puede ser posterior a la fecha del evento",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      await updateMutation.mutateAsync({
        id: eventId,
        name: formData.name,
        description: formData.description || undefined,
        date: new Date(formData.date),
        paymentDueDate: formData.paymentDueDate ? new Date(formData.paymentDueDate) : undefined,
        amount: Math.round(parseFloat(formData.amount) * 100),
      });

      toast({
        title: "Evento actualizado",
        description: "Los cambios han sido guardados",
      });

      router.push(`/dashboard/eventos/${eventId}`);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No pudimos actualizar el evento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    setLoading(true);
    try {
      await updateMutation.mutateAsync({
        id: eventId,
        status: "CANCELLED",
      });

      toast({
        title: "Evento cancelado",
        description: "El evento ha sido cancelado",
      });

      router.push("/dashboard/eventos");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No pudimos cancelar el evento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const previewEventDate = formData.date ? new Date(formData.date) : initialData.date;
  const previewPaymentDueDate = formData.paymentDueDate ? new Date(formData.paymentDueDate) : initialData.paymentDueDate;
  const previewAmount = formData.amount ? Math.round(parseFloat(formData.amount) * 100) : initialData.amount;

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

      {/* Fecha de vencimiento de pago */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Fecha de vencimiento de pago (opcional)
        </label>
        <input
          type="date"
          value={formData.paymentDueDate}
          max={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, paymentDueDate: e.target.value }))
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
      </div>

      {/* Botones principales */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-[rgba(255,255,255,0.10)]">
        <Link
          href={`/dashboard/eventos/${eventId}`}
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
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>

      {/* Zona de peligro */}
      <div className="rounded-lg border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
        <h3 className="font-semibold text-red-900 dark:text-red-300">
          ⚠️ Zona de peligro
        </h3>
        <p className="mt-2 text-sm text-red-800 dark:text-red-200">
          Al cancelar un evento, se marca como cancelado pero los registros de
          pago permanecen en la historia.
        </p>
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          disabled={loading}
          className="mt-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Cancelar evento
        </button>
      </div>

      {/* Modal de confirmación */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-sb-uplift rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              ¿Cancelar evento?
            </h2>
            <p className="mt-2 text-gray-600 dark:text-sb-light/70">
              Esta acción marcará el evento como cancelado. ¿Estás seguro?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-4 py-2.5 text-center font-medium text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
              >
                No, mantener evento
              </button>
              <button
                onClick={handleCancelEvent}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-2.5 text-center font-medium text-white transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Sí, cancelar evento"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </form>

      {/* Preview */}
      <div className="sticky top-20">
        <EventInvitationPreview
          eventName={formData.name || "Nombre del evento"}
          description={formData.description || undefined}
          date={previewEventDate}
          groupNames={["Toda la escuela"]}
          amount={previewAmount}
          dueDate={previewPaymentDueDate || previewEventDate}
        />
      </div>
    </div>
  );
}
