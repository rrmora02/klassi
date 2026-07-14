import type { MetadataRoute } from "next";

// La PWA instalada abre directamente el portal de familias.
// Ver docs/arquitectura-pwa-notificaciones.md §3

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Klassi — Portal de familias",
    short_name:       "Klassi",
    description:      "Avisos, pagos y comunicación con tu escuela",
    start_url:        "/portal",
    scope:            "/",
    display:          "standalone",
    orientation:      "portrait",
    background_color: "#ffffff",
    theme_color:      "#1D3557",
    lang:             "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
