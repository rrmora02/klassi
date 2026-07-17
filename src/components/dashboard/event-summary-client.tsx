"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, TrendingUp } from "lucide-react";
import Link from "next/link";

interface EventSummaryClientProps {
  year: number;
  month: number;
}

export function EventSummaryClient({ year, month }: EventSummaryClientProps) {
  const { data, isLoading } = api.events.getMonthlyEventStats.useQuery({ year, month });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift p-5">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.eventCount === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-gray-50 dark:bg-sb-uplift/50 p-5 text-center">
        <Calendar className="h-8 w-8 text-gray-400 dark:text-sb-light/40 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-600 dark:text-sb-light/70">
          Sin eventos este mes
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sb-green dark:text-sb-light" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Pagos de eventos
          </h2>
          <span className="rounded-full bg-sb-green/20 dark:bg-sb-green/30 px-2 py-0.5 text-xs font-medium text-sb-green dark:text-sb-light">
            {data.eventCount}
          </span>
        </div>
        <Link
          href="/dashboard/eventos"
          className="text-xs font-medium text-sb-green hover:text-sb-accent dark:text-sb-light dark:hover:text-sb-light transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      {/* Contenido */}
      <div className="p-5 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 dark:bg-sb-house p-3">
            <p className="text-xs text-gray-600 dark:text-sb-light/70 font-medium">
              Cobrado
            </p>
            <p className="mt-1 text-lg font-semibold text-sb-green dark:text-sb-light">
              {formatCurrency(data.totalPaidAmount)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-sb-house p-3">
            <p className="text-xs text-gray-600 dark:text-sb-light/70 font-medium">
              Esperado
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.totalExpectedAmount)}
            </p>
          </div>
        </div>

        {/* Eventos list */}
        <div className="space-y-3 pt-2">
          {data.events.slice(0, 5).map((event) => (
            <Link
              key={event.eventId}
              href={`/dashboard/eventos/${event.eventId}`}
              className="block p-3 rounded-lg border border-gray-100 dark:border-[rgba(255,255,255,0.07)] hover:bg-gray-50 dark:hover:bg-sb-house/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {event.eventName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-sb-light/60 mt-0.5">
                    📅 {formatDate(event.eventDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-sb-green dark:text-sb-light">
                    {formatCurrency(event.paidAmount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-sb-light/60 mt-0.5">
                    {event.paidPayments}/{event.totalPayments}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
