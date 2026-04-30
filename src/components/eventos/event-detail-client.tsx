"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { Clock, Users, DollarSign, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EventDetailClientProps {
  eventId: string;
  eventName: string;
  eventDate: Date;
  eventAmount: number;
  isSchoolWide: boolean;
  groups: Array<{ id: string; name: string }>;
}

export function EventDetailClient({
  eventId,
  eventName,
  eventDate,
  eventAmount,
  isSchoolWide,
  groups,
}: EventDetailClientProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<
    "PENDING" | "PAID" | "NOT_ATTENDING" | "CANCELLED" | undefined
  >(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Queries
  const { data: statsData } = api.events.getStats.useQuery({ eventId });
  const { data: paymentsData, refetch } = api.events.getPayments.useQuery({
    eventId,
    page,
    pageSize: 20,
    status: filterStatus,
  });

  // Mutations
  const markAttendanceMutation = api.events.markAttendance.useMutation();
  const markAsPaidMutation = api.events.markAsPaid.useMutation();
  const generateMissingMutation = api.events.generateMissingPayments.useMutation();

  const stats = statsData || {
    total: 0,
    willAttend: 0,
    paid: 0,
    pending: 0,
    notAttendingCount: 0,
    totalExpected: 0,
    totalCollected: 0,
  };

  const handleMarkAttendance = async (
    paymentId: string,
    willAttend: boolean
  ) => {
    try {
      await markAttendanceMutation.mutateAsync({
        paymentId,
        willAttend,
      });
      refetch();
      toast({
        title: "Actualizado",
        description: willAttend
          ? "Alumno marcado como asistirá"
          : "Alumno marcado como no asistirá",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos actualizar el registro",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await markAsPaidMutation.mutateAsync({ paymentId });
      refetch();
      toast({
        title: "Pagado",
        description: "Se marcó el pago como realizado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos procesar el pago",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = (paymentId: string, token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/evento/${eventId}/responder?student=${paymentId}&token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(paymentId);
      toast({
        title: "Enlace copiado",
        description: "Puedes compartir este enlace en WhatsApp",
      });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleGenerateMissingPayments = async () => {
    try {
      const result = await generateMissingMutation.mutateAsync({ eventId });
      refetch();
      toast({
        title: "Pagos generados",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos generar los pagos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-sb-light/70">
            Total alumnos
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {stats.total}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-sb-light/70">
            Confirmarán asistencia
          </p>
          <p className="mt-2 text-2xl font-semibold text-sb-green dark:text-sb-light">
            {stats.willAttend}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-sb-light/70">
            Pagados
          </p>
          <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
            {stats.paid}/{stats.willAttend}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-sb-light/70">
            Total cobrado
          </p>
          <p className="mt-2 text-lg sm:text-2xl font-semibold text-sb-green dark:text-sb-light truncate">
            {formatCurrency(stats.totalCollected)}
          </p>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift">
        <div className="border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] px-5 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Registros de pago
            </h2>
            <button
              onClick={handleGenerateMissingPayments}
              disabled={generateMissingMutation.isPending}
              className="rounded px-3 py-1.5 text-xs font-medium bg-sb-accent text-white hover:bg-sb-green transition-colors disabled:opacity-50"
              title="Generar pagos para alumnos nuevos que se inscribieron después de crear el evento"
            >
              {generateMissingMutation.isPending ? "Generando..." : "+ Agregar nuevos alumnos"}
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Todos", value: undefined },
              { label: "Pendientes", value: "PENDING" as const },
              { label: "Pagados", value: "PAID" as const },
              { label: "No asistirán", value: "NOT_ATTENDING" as const },
            ].map((filter) => (
              <button
                key={filter.label}
                onClick={() => {
                  setFilterStatus(filter.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === filter.value
                    ? "bg-sb-accent text-white"
                    : "bg-gray-100 dark:bg-sb-house text-gray-700 dark:text-sb-light/80 hover:bg-gray-200 dark:hover:bg-sb-house/80"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {paymentsData?.payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-gray-400 dark:text-sb-light/50" />
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-sb-light/80">
              Sin registros
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)]">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-sb-light/70 sm:px-5">
                    Alumno
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-sb-light/70 sm:px-5">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-sb-light/70 sm:px-5">
                    Asistencia
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-sb-light/70 sm:px-5">
                    Enlace
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-sb-light/70 sm:px-5">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentsData?.payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] hover:bg-gray-50 dark:hover:bg-sb-house/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 sm:px-5">
                      {fullName(
                        payment.student.firstName,
                        payment.student.lastName
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          payment.status === "PAID"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : payment.status === "PENDING"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {payment.status === "PAID"
                          ? "Pagado"
                          : payment.status === "PENDING"
                            ? "Pendiente"
                            : "No asistirá"}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex gap-2">
                        {payment.willAttend === null ? (
                          <span className="text-xs text-gray-500 dark:text-sb-light/60">
                            Sin confirmar
                          </span>
                        ) : payment.willAttend ? (
                          <span className="inline-flex items-center gap-1 text-xs text-sb-green dark:text-sb-light">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                            No
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <button
                        onClick={() => handleCopyLink(payment.id, payment.token)}
                        className="inline-flex items-center gap-1.5 text-xs rounded px-2.5 py-1.5 bg-gray-100 dark:bg-sb-house text-gray-700 dark:text-sb-light/80 hover:bg-gray-200 dark:hover:bg-sb-house/80 transition-colors"
                        title="Copiar enlace para compartir en WhatsApp"
                      >
                        {copiedId === payment.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <div className="flex justify-end gap-2">
                        {payment.status === "PENDING" &&
                          payment.willAttend === true && (
                            <button
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="rounded px-2.5 py-1 text-xs bg-sb-accent text-white hover:bg-sb-green transition-colors"
                            >
                              Pagar
                            </button>
                          )}
                        {payment.willAttend !== false && (
                          <button
                            onClick={() =>
                              handleMarkAttendance(
                                payment.id,
                                payment.willAttend !== true
                              )
                            }
                            className="rounded px-2.5 py-1 text-xs bg-gray-200 dark:bg-sb-house text-gray-700 dark:text-sb-light/80 hover:bg-gray-300 dark:hover:bg-sb-house/80 transition-colors"
                          >
                            {payment.willAttend === true ? "No" : "Sí"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {paymentsData && paymentsData.pages > 1 && (
          <div className="border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)] px-5 py-4 flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-sb-light/70">
              Página {page} de {paymentsData.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded px-3 py-1.5 border border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-700 dark:text-sb-light/70 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-sb-house"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(paymentsData.pages, page + 1))}
                disabled={page === paymentsData.pages}
                className="rounded px-3 py-1.5 border border-gray-200 dark:border-[rgba(255,255,255,0.10)] text-gray-700 dark:text-sb-light/70 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-sb-house"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
