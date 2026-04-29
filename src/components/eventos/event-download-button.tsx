"use client";

import { Download } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";

interface EventDownloadButtonProps {
  eventId: string;
  eventName: string;
  previewElementId?: string;
}

export function EventDownloadButton({
  eventId,
  eventName,
  previewElementId = "invitation-preview"
}: EventDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Obtener el elemento del preview
      const element = document.getElementById(previewElementId);
      if (!element) {
        throw new Error("Preview element not found");
      }

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      // Convertir canvas a blob y descargar
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create image");
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${eventName}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Error downloading invitation:", error);
      alert("No pudimos descargar la invitación. Intenta de nuevo.");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4" />
      {isLoading ? "Descargando..." : "Descargar invitación"}
    </button>
  );
}


