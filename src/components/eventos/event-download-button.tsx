"use client";

import { Download } from "lucide-react";

interface EventDownloadButtonProps {
  eventName: string;
  htmlContent: string;
}

export function EventDownloadButton({ eventName, htmlContent }: EventDownloadButtonProps) {
  const handleDownload = () => {
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent)
    );
    element.setAttribute("download", `${eventName}.html`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-sb-light/80 hover:bg-gray-50 dark:hover:bg-sb-house transition-colors"
    >
      <Download className="h-4 w-4" />
      Descargar HTML
    </button>
  );
}
