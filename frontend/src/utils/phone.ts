// Utilitaires de contact (appel / WhatsApp) à partir d'un numéro.

/** Ne garde que les chiffres (format wa.me). */
export function phoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/** Lien WhatsApp (wa.me) si un numéro lisible est présent. */
export function whatsappLink(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/** Lien d'appel tel: si un numéro est présent. */
export function telLink(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `tel:${digits}`;
}