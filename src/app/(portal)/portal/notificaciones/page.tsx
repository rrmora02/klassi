"use client";

import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Bell, Megaphone, CreditCard, MessageCircle, CheckCheck, CheckCircle2, PartyPopper } from "lucide-react";
import { ActionButton, Card, EmptyState, Skeleton, StatusBadge } from "@/components/shared";

function iconForType(type: string) {
  if (type === "announcement")       return <Megaphone size={18} className="portal-ico-announce" aria-hidden="true" />;
  if (type === "payment.paid")       return <CheckCircle2 size={18} className="portal-ico-message" aria-hidden="true" />;
  if (type.startsWith("payment"))    return <CreditCard size={18} className="portal-ico-payment" aria-hidden="true" />;
  if (type === "event.invitation")   return <PartyPopper size={18} className="portal-ico-announce" aria-hidden="true" />;
  if (type.startsWith("message"))    return <MessageCircle size={18} className="portal-ico-message" aria-hidden="true" />;
  return <Bell size={18} className="text-[var(--color-text-secondary)]" aria-hidden="true" />;
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
  const { toast } = useToast();
  const { data, isLoading } = api.notifications.list.useQuery({ page: 1, pageSize: 50 });

  const invalidate = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };
  const markRead    = api.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      invalidate();
      toast({ title: "Marcadas como leídas", description: "Ya no tienes avisos nuevos." });
    },
    onError: () => toast({ title: "No se pudieron marcar como leídas", description: "Revisa tu conexión e intenta de nuevo.", variant: "destructive" }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unread ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">Notificaciones</h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {data ? (unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día") : "…"}
          </p>
        </div>
        {unreadCount > 0 && (
          <ActionButton variant="secondary" onClick={() => markAllRead.mutate()} loading={markAllRead.isLoading}>
            {!markAllRead.isLoading && <CheckCheck className="h-4 w-4" aria-hidden="true" />} Marcar todas como leídas
          </ActionButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando notificaciones">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="Sin notificaciones aún"
          message="Aquí verás los avisos y recordatorios de tu escuela."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {notifications.map((notification) => {
            const unread = !notification.readAt;
            const body = (
              <>
                <span className="portal-icon-bubble flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]">
                  {iconForType(notification.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`text-sm text-[var(--color-text-primary)] ${unread ? "font-bold" : "font-medium"}`}>
                      {notification.title}
                    </span>
                    {unread && <StatusBadge tone="brand" icon={Bell}>Nueva</StatusBadge>}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {notification.body}
                  </span>
                  <span className="mt-1.5 block text-xs text-[var(--color-text-secondary)]">
                    {timeAgo(notification.createdAt)}
                  </span>
                </span>
              </>
            );
            const rowClass = "flex w-full items-start gap-3 p-4 text-left";
            return (
              <Card as="li" key={notification.id} accent={unread} padding="none">
                {unread ? (
                  <button
                    type="button"
                    onClick={() => markRead.mutate({ id: notification.id })}
                    aria-label={`Marcar como leída: ${notification.title}`}
                    className={`${rowClass} min-h-[var(--tap-min)] cursor-pointer rounded-xl bg-transparent`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={rowClass}>{body}</div>
                )}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
