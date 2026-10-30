/**
 * Scrambles a phone number (reversed, then base64) so the page's HTML and data
 * never contain it as text; RevealPhone undoes it in the browser on a tap.
 * This only stops scrapers reading the page; anyone who taps can see the number.
 */
export function scramblePhone(phone: string): string {
  return Buffer.from(phone.split("").reverse().join(""), "utf8").toString("base64");
}
