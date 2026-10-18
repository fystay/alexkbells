import { isValidEmail } from "../form-validation";
import { isUuid } from "./db";
import { parsePounds } from "./money";
import { isDateKey, isTime } from "./time";

/**
 * Reads and checks a portal form on the server. Each getter records a
 * message for its field when the value is missing or wrong, and returns a
 * safe value either way; check `ok` before using any of them.
 */
export class FormReader {
  readonly errors: Record<string, string> = {};

  constructor(private readonly form: FormData) {}

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  private raw(name: string): string {
    const value = this.form.get(name);
    return typeof value === "string" ? value : "";
  }

  private fail(name: string, message: string) {
    if (!this.errors[name]) this.errors[name] = message;
  }

  /** Trimmed text; single line unless `multiline`. */
  text(name: string, opts: { label: string; max: number; required?: boolean; multiline?: boolean }): string {
    let value = this.raw(name).replace(/\r\n/g, "\n").trim();
    if (!opts.multiline) value = value.replace(/\s+/g, " ");
    if (opts.required && !value) this.fail(name, `Enter ${opts.label}.`);
    if (value.length > opts.max) this.fail(name, `${capitalise(opts.label)} must be ${opts.max} characters or fewer.`);
    return value.slice(0, opts.max);
  }

  email(name: string, required = false): string {
    const value = this.raw(name).trim();
    if (!value) {
      if (required) this.fail(name, "Enter an email address.");
      return "";
    }
    if (value.length > 254 || !isValidEmail(value)) this.fail(name, "Enter a valid email address, like name@example.com.");
    return value;
  }

  phone(name: string): string {
    const value = this.raw(name).trim().replace(/\s+/g, " ");
    if (value && (!/^\+?[\d ()-]{7,20}$/.test(value) || value.replace(/\D/g, "").length < 7)) {
      this.fail(name, "Enter a valid phone number.");
    }
    return value.slice(0, 30);
  }

  date(name: string, opts: { label: string; required?: boolean }): string {
    const value = this.raw(name).trim();
    if (!value) {
      if (opts.required) this.fail(name, `Enter ${opts.label}.`);
      return "";
    }
    if (!isDateKey(value)) this.fail(name, `Enter ${opts.label} as a real date.`);
    return value;
  }

  time(name: string, opts: { label: string; required?: boolean }): string {
    const value = this.raw(name).trim();
    if (!value) {
      if (opts.required) this.fail(name, `Enter ${opts.label}.`);
      return "";
    }
    if (!isTime(value)) this.fail(name, `Enter ${opts.label} as a time, like 18:30.`);
    return value;
  }

  /** Pounds as typed ("10", "10.50") -> pence. Null when empty and not required. */
  pounds(name: string, opts: { label: string; required?: boolean; allowZero?: boolean }): number | null {
    const value = this.raw(name).trim();
    if (!value) {
      if (opts.required) this.fail(name, `Enter ${opts.label}.`);
      return null;
    }
    const pence = parsePounds(value);
    if (pence === null) {
      this.fail(name, `Enter ${opts.label} in pounds, like 10 or 12.50.`);
      return null;
    }
    if (pence === 0 && !opts.allowZero) this.fail(name, `${capitalise(opts.label)} must be more than £0.`);
    return pence;
  }

  int(name: string, opts: { label: string; min: number; max: number; required?: boolean }): number | null {
    const value = this.raw(name).trim();
    if (!value) {
      if (opts.required) this.fail(name, `Enter ${opts.label}.`);
      return null;
    }
    const n = Number(value);
    if (!/^\d+$/.test(value) || n < opts.min || n > opts.max) {
      this.fail(name, `Enter ${opts.label} between ${opts.min} and ${opts.max}.`);
      return null;
    }
    return n;
  }

  oneOf<T extends string>(name: string, values: readonly T[], opts: { label: string; required?: boolean }): T | "" {
    const value = this.raw(name);
    if (!value && !opts.required) return "";
    if (!(values as readonly string[]).includes(value)) {
      this.fail(name, `Choose ${opts.label}.`);
      return "";
    }
    return value as T;
  }

  id(name: string, opts: { label: string; required?: boolean }): string {
    const value = this.raw(name).trim();
    if (!value) {
      if (opts.required) this.fail(name, `Choose ${opts.label}.`);
      return "";
    }
    if (!isUuid(value)) this.fail(name, `Choose ${opts.label}.`);
    return value;
  }

  checked(name: string): boolean {
    return this.raw(name) === "on" || this.raw(name) === "true";
  }

  /** Records a message against a field after cross-field checks. */
  error(name: string, message: string) {
    this.fail(name, message);
  }
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
