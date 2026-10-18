import { SUBSCRIPTION_STATUS } from "@/lib/coach/labels";
import { penceToInput } from "@/lib/coach/money";
import type { Subscription } from "@/lib/coach/types";
import { Field, MoneyField, SelectField, TextArea } from "./form";

export function SubscriptionFields({ subscription, defaults }: { subscription?: Subscription; defaults: { pricePence: number; today: string } }) {
  const s = subscription;
  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field name="plan" label="Plan" defaultValue={s?.plan ?? "Online coaching"} required maxLength={100} />
        <MoneyField name="price" label="Price per month" defaultValue={penceToInput(s?.price_pence ?? defaults.pricePence)} required hint="Shown as expected income, never as received." />
        <SelectField name="status" label="Status" required defaultValue={s?.status ?? "active"} options={Object.entries(SUBSCRIPTION_STATUS).map(([value, label]) => ({ value, label }))} />
        <Field name="start_on" label="Start date" type="date" defaultValue={s?.start_on ?? defaults.today} required />
        <Field name="renews_on" label="Next renewal" type="date" defaultValue={s?.renews_on ?? s?.start_on ?? defaults.today} hint="When the next month's charge is due." />
        <Field name="end_on" label="End date" type="date" defaultValue={s?.end_on ?? ""} hint="Only if it has a fixed end." />
        <Field name="check_in_days" label="Days between check-ins" type="number" inputMode="numeric" min={1} max={90} defaultValue={s?.check_in_days ?? 7} required />
        <Field name="next_check_in_on" label="Next check-in" type="date" defaultValue={s?.next_check_in_on ?? ""} hint="Left empty: worked out from the interval." />
      </div>
      <TextArea name="notes" label="Coach notes and agreed actions" defaultValue={s?.notes} rows={4} maxLength={2000} />
    </>
  );
}
