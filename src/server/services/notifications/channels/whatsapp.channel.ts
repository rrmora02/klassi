import type { NotificationChannel, NotificationPayload } from "../notification.service";

// Implementación pendiente — requiere Twilio o similar
// Para activar: implementar send() con la API de WhatsApp Business y
// setear TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM en .env
export const whatsappChannel: NotificationChannel = {
  name: "whatsapp",

  async send(_payload: NotificationPayload): Promise<void> {
    console.warn("[WhatsApp] Canal no implementado aún. Payload ignorado:", _payload.type);
  },
};
