import { emailChannel } from "./channels/email.channel";
import { whatsappChannel } from "./channels/whatsapp.channel";

export type NotificationType =
  | "trial-ending"
  | "subscription-updated"
  | "payment-failed"
  | "downgrade-scheduled";

export interface NotificationPayload {
  to:   string;
  type: NotificationType;
  data: Record<string, unknown>;
}

export interface NotificationChannel {
  name: string;
  send(payload: NotificationPayload): Promise<void>;
}

const ACTIVE_CHANNELS: NotificationChannel[] = [
  emailChannel,
  // whatsappChannel, // descomentar cuando se implemente Twilio
];

// Expuesto para testing o usos futuros
export { whatsappChannel };

class NotificationService {
  async send(payload: NotificationPayload): Promise<void> {
    await Promise.allSettled(
      ACTIVE_CHANNELS.map(channel =>
        channel.send(payload).catch(err =>
          console.error(`[notifications] Canal ${channel.name} falló:`, err)
        )
      )
    );
  }

  async sendTrialEnding(opts: {
    to: string;
    schoolName: string;
    daysLeft: number;
    billingUrl: string;
  }) {
    await this.send({ to: opts.to, type: "trial-ending", data: opts });
  }

  async sendSubscriptionUpdated(opts: {
    to: string;
    schoolName: string;
    newPlan: string;
    billingUrl: string;
  }) {
    await this.send({ to: opts.to, type: "subscription-updated", data: opts });
  }

  async sendPaymentFailed(opts: {
    to: string;
    schoolName: string;
    billingUrl: string;
  }) {
    await this.send({ to: opts.to, type: "payment-failed", data: opts });
  }

  async sendDowngradeScheduled(opts: {
    to: string;
    schoolName: string;
    newPlan: string;
    effectiveDate: string;
    billingUrl: string;
  }) {
    await this.send({ to: opts.to, type: "downgrade-scheduled", data: opts });
  }
}

export const notificationService = new NotificationService();
