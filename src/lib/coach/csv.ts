import { PAYMENT_METHOD, PAYMENT_STATUS, SERVICE } from "./labels";
import type { Client, Payment, Refund } from "./types";

/**
 * CSV export of the ledger. Cells that a spreadsheet would treat as a formula
 * (starting with = + - @, tab or carriage return) are prefixed with a quote,
 * so a client's name or note can never run as a formula when opened.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  // CRLF line endings and a BOM so Excel opens UTF-8 (e.g. £) correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const pounds = (pence: number) => (pence / 100).toFixed(2);

/** Payments dated in the range and refunds dated in the range, as ledger lines (refunds negative). */
export function ledgerCsv(payments: readonly Payment[], refunds: readonly Refund[], allPayments: readonly Payment[], clients: readonly Client[], range: { from: string; to: string }): string {
  const name = (id: string) => clients.find((c) => c.id === id)?.full_name ?? "";
  const rows: (string | number)[][] = [["Date", "Type", "Client", "Service", "Method", "Status", "Amount (GBP)", "Reference", "Note", "Payment ID"]];
  const lines: { date: string; row: (string | number)[] }[] = [];
  for (const p of payments) {
    if (p.paid_on < range.from || p.paid_on > range.to) continue;
    lines.push({
      date: p.paid_on,
      row: [p.paid_on, "Payment", name(p.client_id), SERVICE[p.service], PAYMENT_METHOD[p.method], PAYMENT_STATUS[p.status], pounds(p.amount_pence), p.reference, p.note, p.id],
    });
  }
  for (const r of refunds) {
    if (r.refunded_on < range.from || r.refunded_on > range.to) continue;
    const p = allPayments.find((x) => x.id === r.payment_id);
    lines.push({
      date: r.refunded_on,
      row: [r.refunded_on, "Refund", p ? name(p.client_id) : "", p ? SERVICE[p.service] : "", p ? PAYMENT_METHOD[p.method] : "", "Refunded", pounds(-r.amount_pence), "", r.note, r.payment_id],
    });
  }
  lines.sort((a, b) => a.date.localeCompare(b.date));
  return toCsv([...rows, ...lines.map((l) => l.row)]);
}
