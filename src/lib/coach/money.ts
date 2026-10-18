/** Money in the portal: whole pence in the database, pounds on screen, GBP only. */

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 });

/** 1050 -> "£10.50"; negative amounts get a minus sign ("−£5.00"). */
export function formatPence(pence: number): string {
  const text = gbp.format(Math.abs(pence) / 100);
  return pence < 0 ? `−${text}` : text;
}

/** For form fields: 1050 -> "10.50", 1000 -> "10". */
export function penceToInput(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

/** Largest amount the ledger accepts in one entry (matches the database checks). */
export const MAX_PENCE = 1_000_000;

/**
 * "10", "10.5", "10.50", "£10.50" or "1,250" -> pence. Null for anything else,
 * including negative amounts and more than two decimal places.
 */
export function parsePounds(raw: string): number | null {
  const text = raw.trim().replace(/^£/, "").replace(/,(?=\d{3}(\D|$))/g, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return pence <= MAX_PENCE ? pence : null;
}

/** £ from the site's published prices (src/content/services.ts), as pence, for form defaults. */
export function poundsToPence(amountGbp: number): number {
  return Math.round(amountGbp * 100);
}
