# Member accounts: draft for review

**Status: draft, nothing applied.** The database change is written and tested on a throwaway local database only. It has not touched the live Supabase project, and no website pages for it are built yet. Approve (or change) the decisions below first.

Files:
- `supabase/drafts/20261027000000_akb_member_accounts.sql`: the database change (outside `supabase/migrations/`, so the CLI never runs it).
- `supabase/drafts/20261027000000_akb_member_accounts.test.sql`: its tests (run in one transaction, rolled back).

## What members get

Members sign in with a link emailed to them (no password), then on one page they can:
- see their plan, whether it's active or paused, and the date it renews;
- see this period's credits: total, used and left, and when the period ends;
- see their upcoming classes (and the last four weeks);
- **book a class with a credit**: any timetabled class in their current period that isn't full or cancelled;
- **cancel a class they booked with a credit**: 24 hours or more before, the credit comes back; later than that, they're told first that the credit will be used, as the policy says;
- sign out, or sign out of every device.

What they **can't** do (Alex does these in the coach area, as now): pay, change their details, pause or cancel their membership, or cancel a place they didn't pay for with a credit. The membership-cancellation rules aren't written down yet, so the site doesn't offer it rather than guess.

## Decisions for you

### 1. How members sign in (recommended: our own one-time email links)

| | **A. Our own email links (recommended)** | B. Supabase Auth email links |
|---|---|---|
| How | The website emails a one-time link, keeps the session itself | Supabase creates a login account per member |
| New database logins | None. Members never get database access | One Supabase user per member |
| Shared project risk | None | **Real**: this Supabase project also holds another app's tables (FYStay's `User`, `Booking`, …, with rows). Every Supabase user gets the `authenticated` database role, so whatever that app allows `authenticated` to read becomes reachable with a member's login. We'd have to audit or lock down another app's tables first |
| Email sending | Our provider (Resend) | Supabase's built-in email is limited to a few emails an hour; real use needs Resend set up in Supabase too |
| Code | Small: hashing, a cookie, three pages | Similar, plus Supabase Auth settings |

The draft is written for **A**. (Moving this site to its own Supabase project, already flagged in ARCHITECTURE.md, would remove the shared-project risk whichever you choose.)

### 2. Who can sign in

Anyone whose client record has their email and who has a current membership: active or paused, or cancelled but with credits still running until the end of the last period. Former members and people with no membership get no link. The form always shows the same message ("If that's a member's email, we've sent a link"), so it can't be used to find out who is a member.

### 3. Limits (recommended as drafted)

- A sign-in link works **once**, for **15 minutes**.
- At most **5 links an hour** per member.
- Staying signed in: **30 days**, then sign in again. Signing out ends it at once; Alex can sign a member out of every device.

## Before it can go live

1. **Email sending in production.** Vercel production currently has no Resend settings (checked 2026-10-26: only `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `COACH_EMAIL` are set), so booking alerts aren't emailed today and sign-in links couldn't be sent. Set `RESEND_API_KEY`, `BOOKING_FROM_EMAIL` (a verified sending domain) and `BOOKING_NOTIFY_EMAIL` (DEPLOYMENT.md → Email alerts). This is also TASKS P0 already.
2. **Your go-ahead on the decisions above**, then the migration is moved into `supabase/migrations/` and applied to the live project (it only adds two tables and functions; it changes no existing table or row).
3. **The privacy notice updated** (wording below), live before members can sign in.

## How access works (row-level security)

The same model as the rest of the project, which keeps member data out of reach of anything but this website's server:
- Members never get database credentials, and the database gets no new roles or logins.
- The two new tables (`akb_member_login_links`, `akb_member_sessions`) have **row-level security on with no policies**, and `anon`/`authenticated` are revoked: only the server's secret key can read or write them. (Tested: `anon` and `authenticated` are refused on the tables and the functions.)
- Sign-in links and sessions are stored only as **SHA-256 hashes**. A leaked database copy holds no usable link or session.
- The server works out who is signed in from the session cookie, then calls the member functions with that client's id. Every member function **checks ownership again in SQL**: a member can only see, book or cancel their own places, even if the website code had a bug.
- Booking uses the **existing credit, capacity and cancelled-class rules** in the database; there's no new way round them. No new personal data is collected beyond sign-in records.

## Website pages (to build after approval)

- `/account/sign-in`: email field, then "Check your email".
- `/account/confirm?token=…`: a **"Sign in" button**, not an automatic sign-in, because some email services open links to scan them, which would use up a one-time link.
- `/account`: the overview, Book with a credit (the class calendar, current period only), Cancel (with the 24-hour warning), Sign out / Sign out everywhere.
- Cookie: `akb_member_session`, httpOnly, Secure, SameSite=Lax, only sent to `/account`, 30 days.
- A daily job calls `akb_member_cleanup` (old links after a day, ended sessions after 30 days).
- Optional: an email to Alex when a member books or cancels.

## Privacy notice: proposed wording

Changes to `/privacy` (the first bullet also covers the membership join form that's already built; the notice doesn't mention it yet):

- **What we collect**, add: "When you send a membership request we also receive the plan you choose, your first class if you pick one, and the date and time you agreed to the membership terms and cancellation policy. If you're a member and sign in to your account, we keep a record of each sign-in: a coded copy of the sign-in link and of your session, and when they were created, last used and ended. We don't record where you are or what device you use."
- **Why we use it**, add: "To run your membership and your account, because you asked us to (UK GDPR Article 6(1)(b)), and to keep your account secure, which is in both our interests (Article 6(1)(f))."
- **Where it goes**, add: "Sign-in links are emailed to you by our email provider (Resend)."
- **How long we keep it**, add: "Sign-in links are deleted after a day, and records of your sessions 30 days after you sign out or they expire."
- **Cookies**, replace with: "This website does not use analytics, advertising or tracking cookies. If you're a member and sign in, we set one cookie that keeps you signed in for up to 30 days; it's only used on your account pages, and signing out removes it. The coach login sets two cookies that keep the coach signed in; they are only used on the coach's pages."
- **Your rights**, add: "You can sign out of every device from your account page, or ask Alex to."

## How it was tested

On a throwaway local PostgreSQL 16 with Supabase's `anon`, `authenticated` and `service_role` roles: every migration in `supabase/migrations/` applied in order, then the draft, twice (it's safe to run again). The test file then checks, in one transaction that is rolled back: who counts as a member (active, paused, cancelled with credits left, former, none); links (case-insensitive email, non-members and unknown addresses refused, the 5-an-hour limit, single use, expiry, stored hashed); sessions (sign out one device, everywhere, by the coach, expiry); booking (credit used, no pay-as-you-go charge, already booked, class started, outside the current period, non-member, running out of credits, full and cancelled classes); cancelling (in time returns the credit, late keeps it used, someone else's place refused, re-booking a cancelled place); the overview's figures; clean-up; and that `anon` and `authenticated` are refused everywhere. **Result: all checks passed.** Not yet tested: the website pages (not built) and the live project.

To run it again: start a local Postgres, create the three roles, apply `supabase/migrations/*.sql` in order and the draft, then `psql -v ON_ERROR_STOP=1 -f supabase/drafts/20261027000000_akb_member_accounts.test.sql`. It ends with `ALL MEMBER ACCOUNT CHECKS PASSED`.

## Undoing it

Before any member has signed in, it can be removed completely:

```sql
drop function if exists public.akb_member_cleanup(), public.akb_member_cancel_place(uuid, uuid),
  public.akb_member_book_class(uuid, text, date, timestamptz, integer), public.akb_member_overview(uuid),
  public.akb_member_end_sessions(uuid), public.akb_member_sign_out(text, boolean),
  public.akb_member_session_client(text), public.akb_member_redeem_login_link(text, text),
  public.akb_member_create_login_link(text, text), public.akb_is_member(uuid), public.akb_london_today();
drop table if exists public.akb_member_sessions, public.akb_member_login_links;
```

Places members booked are ordinary class places and stay (they're also in the coach area).
