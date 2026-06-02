import type { NotificationChannel, NotificationPayload } from "../notification.service";
import {
  sendTrialEndingEmail,
  sendSubscriptionUpdatedEmail,
  sendPaymentFailedEmail,
  sendDowngradeScheduledEmail,
} from "@/server/services/email.service";

export const emailChannel: NotificationChannel = {
  name: "email",

  async send(payload: NotificationPayload): Promise<void> {
    const { to, type, data } = payload;

    switch (type) {
      case "trial-ending":
        await sendTrialEndingEmail(to, data as { schoolName: string; daysLeft: number; billingUrl: string });
        break;
      case "subscription-updated":
        await sendSubscriptionUpdatedEmail(to, data as { schoolName: string; newPlan: string; billingUrl: string });
        break;
      case "payment-failed":
        await sendPaymentFailedEmail(to, data as { schoolName: string; billingUrl: string });
        break;
      case "downgrade-scheduled":
        await sendDowngradeScheduledEmail(to, data as { schoolName: string; newPlan: string; effectiveDate: string; billingUrl: string });
        break;
    }
  },
};
