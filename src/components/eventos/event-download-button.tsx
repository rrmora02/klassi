"use client";

import { Download } from "lucide-react";

interface EventDownloadButtonProps {
  eventId: string;
  eventName: string;
}

export function EventDownloadButton({ eventId, eventName }: EventDownloadButtonProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/eventos/${eventId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("No pudimos descargar el PDF. Intenta de nuevo.");
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
    >
      <Download className="h-4 w-4" />
      Descargar invitación
    </button>
  );
}

