"use client";

import { api } from "@/lib/trpc";
import { Bell, Megaphone, CreditCard, MessageCircle, CheckCheck } from "lucide-react";

function iconForType(type: string) {
  if (type === "announcement")     return <Megaphone size={16} className="portal-ico-announce" />;
  if (type === "payment.reminder") return <CreditCard size={16} className="portal-ico-payment" />;
  if (type.startsWith("message"))  return <MessageCircle size={16} className="portal-ico-message" />;
  return <Bell size={16} style={{ color: "var(--color-text-tertiary)" }} />;
}

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7)   return `hace ${days} d`;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(date));
}

export default function NotificacionesPage() {
  const utils = api.useContext();
  const { data, isLoading } = api.notifications.list.useQuery({ page: 1, pageSize: 50 });

  const invalidate = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };
  const markRead    = api.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = api.notifications.markAllRead.useMutation({ onSuccess: invalidate });

  const notifications = data?.notifications ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Notificaciones</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {data ? `${data.unread} sin leer` : "…"}
          </p>
        </div>
        {(data?.unread ?? 0) > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isLoading}
            className="portal-accent-text"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: 20, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
          >
            <CheckCheck size={13} /> Marcar leídas
          </button>
        )}
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "48px 0" }}>Cargando…</p>
      ) : notifications.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "48px 20px", textAlign: "center" }}>
          <Bell size={28} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>Sin notificaciones aún</p>
          <p style={{ fontSize: 12.5, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
            Aquí verás los avisos y recordatorios de tu escuela
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notifications.map((notification) => {
            const unread = !notification.readAt;
            return (
              <button
                key={notification.id}
                onClick={() => unread && markRead.mutate({ id: notification.id })}
                className={unread ? "portal-accent-border" : undefined}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", cursor: unread ? "pointer" : "default",
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 12, padding: "12px 14px", width: "100%",
                  opacity: unread ? 1 : 0.75,
                }}
              >
                <span className="portal-icon-bubble" style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {iconForType(notification.type)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: unread ? 700 : 500, color: "var(--color-text-primary)" }}>
                    {notification.title}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--color-text-secondary)", marginTop: 2, lineHeight: 1.45 }}>
                    {notification.body}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                    {timeAgo(notification.createdAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
