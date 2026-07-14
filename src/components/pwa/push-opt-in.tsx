"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Status = "loading" | "unsupported" | "denied" | "prompt" | "subscribed";

/**
 * Banner de activación de notificaciones push.
 * En iOS solo funciona con la PWA instalada en la pantalla de inicio;
 * si no lo está, muestra la instrucción de instalación.
 */
export function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const subscribe = api.notifications.subscribePush.useMutation();

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      if (isIos && !standalone) setIosNeedsInstall(true);
      setStatus("unsupported");
      return;
    }
    if (isIos && !standalone) {
      setIosNeedsInstall(true);
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "prompt");
    }).catch(() => setStatus("prompt"));
  }, []);

  async function enablePush() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("[pwa] NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "prompt");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      await subscribe.mutateAsync({
        endpoint:  subscription.endpoint,
        p256dh:    json.keys?.p256dh ?? "",
        auth:      json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setStatus("subscribed");
    } catch (err) {
      console.error("[pwa] error suscribiendo push:", err);
    }
  }

  if (status === "loading" || status === "subscribed") return null;

  if (iosNeedsInstall) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(29,53,87,0.06)", border: "0.5px solid rgba(29,53,87,0.2)", borderRadius: 12, padding: "12px 14px" }}>
        <Bell size={16} style={{ color: "#1D3557", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--color-text-primary)" }}>Instala la app para recibir avisos.</strong>{" "}
          En iPhone: toca <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 14px" }}>
        <BellOff size={16} style={{ color: "#b45309", flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          Las notificaciones están bloqueadas. Actívalas en la configuración del navegador para no perderte avisos.
        </div>
      </div>
    );
  }

  if (status === "unsupported") return null;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", background: "#1D3557", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <Bell size={18} style={{ color: "#fff", flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
          Recibe avisos de tu escuela directamente en tu teléfono
        </div>
      </div>
      <button
        onClick={enablePush}
        disabled={subscribe.isLoading}
        style={{ background: "#fff", color: "#1D3557", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
      >
        {subscribe.isLoading ? "Activando…" : "Activar"}
      </button>
    </div>
  );
}
