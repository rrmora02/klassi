"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Buscar el elemento del preview
      let element = document.getElementById(previewElementId);

      if (!element) {
        // Si no existe, buscar el contenedor del acordeón y expandirlo
        const accordionContainer = document.querySelector('[id*="invitation"]');
        if (accordionContainer) {
          // Buscar el botón del acordeón y hacer clic si es necesario
          const accordionButton = accordionContainer.querySelector('button');
          if (accordionButton) {
            accordionButton.click();
            // Esperar a que se expanda
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // Intentar nuevamente
        element = document.getElementById(previewElementId);

        if (!element) {
          throw new Error("No se puede encontrar el elemento de vista previa. Por favor, expande la sección de vista previa primero.");
        }
      }

      // Capturar el elemento como imagen
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
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
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "Error al descargar",
        description: `No pudimos descargar la invitación: ${errorMessage}`,
        variant: "destructive",
      });
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


