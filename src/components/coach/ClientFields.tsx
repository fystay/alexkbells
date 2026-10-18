import { CLIENT_STATUS, CONTACT_METHOD } from "@/lib/coach/labels";
import type { Client } from "@/lib/coach/types";
import { Field, SelectField, TextArea } from "./form";

/** The client record's fields, for adding and editing. No health or injury questions by design. */
export function ClientFields({ client }: { client?: Client }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field name="full_name" label="Full name" defaultValue={client?.full_name} required maxLength={100} autoComplete="off" />
        <SelectField name="status" label="Status" required defaultValue={client?.status ?? "lead"} options={Object.entries(CLIENT_STATUS).map(([value, label]) => ({ value, label }))} hint="Lead: interested, not yet training. Former: no longer training." />
        <Field name="email" label="Email" type="email" defaultValue={client?.email} autoComplete="off" hint="Used to recognise them when they book again." />
        <Field name="phone" label="Phone" type="tel" defaultValue={client?.phone} autoComplete="off" />
        <Field name="instagram" label="Instagram username" defaultValue={client?.instagram} maxLength={60} autoComplete="off" />
        <SelectField name="preferred_contact" label="Preferred contact" defaultValue={client?.preferred_contact ?? ""} placeholder="No preference" options={Object.entries(CONTACT_METHOD).map(([value, label]) => ({ value, label }))} />
      </div>
      <TextArea name="notes" label="Admin notes" defaultValue={client?.notes} rows={4} maxLength={4000} hint="For running the business only. Don't record health or injury details here." />
    </>
  );
}
