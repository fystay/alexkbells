import type { Client } from "./types";

/**
 * Who a booking request might be. Only an exact email match (case-insensitive)
 * counts as the same person; a matching phone number or name is offered as a
 * possibility for the coach to decide, never merged automatically.
 */

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** UK numbers compared on their last 10 digits, so "07700 900123" matches "+44 7700 900123". */
export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export function normaliseName(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export interface MatchResult {
  /** The client with this email address, if any: safe to treat as the same person. */
  exact: Client | null;
  /** Same phone number or same full name but a different (or no) email: ask the coach. */
  possible: { client: Client; reasons: ("phone" | "name")[] }[];
}

export function matchClients(person: { email: string; phone: string; name: string }, clients: readonly Client[]): MatchResult {
  const email = normaliseEmail(person.email);
  const phone = normalisePhone(person.phone);
  const name = normaliseName(person.name);
  const exact = email ? clients.find((c) => c.email && normaliseEmail(c.email) === email) ?? null : null;
  const possible: MatchResult["possible"] = [];
  for (const client of clients) {
    if (client.id === exact?.id) continue;
    const reasons: ("phone" | "name")[] = [];
    if (phone && normalisePhone(client.phone) === phone) reasons.push("phone");
    if (name && normaliseName(client.full_name) === name) reasons.push("name");
    if (reasons.length) possible.push({ client, reasons });
  }
  return { exact, possible };
}
