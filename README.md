# GoodEats 🍽️

A tiny, private, **two-person food-logging PWA**. Snap a photo of your meal, tag it,
and it shows up in a shared feed for you and your friend — with push notifications when
either of you posts, plus a daily reminder to log.

Built as an installable Progressive Web App (no App Store), so you "Add to Home Screen"
on your iPhone and it behaves like a native app.

- **Frontend:** Vite + React + TypeScript + Tailwind, PWA via `vite-plugin-pwa`
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions) — all free tier
- **Push:** Web Push + VAPID, sent from Supabase Edge Functions (no third-party vendor)
- **Hosting:** Vercel (free)

---

## How it works

| Piece | What it does |
| --- | --- |
| `src/pages/Login.tsx` | Email + password sign-in (`signInWithPassword`) |
| `src/pages/Feed.tsx` | Shared feed; realtime-refreshes when either of you posts |
| `src/pages/Add.tsx` | Camera capture → compress → upload to Storage → insert row |
| `src/pages/Settings.tsx` | Enable notifications, iOS install hint, sign out |
| `src/sw.ts` | Service worker: offline shell + `push` / `notificationclick` handlers |
| `supabase/migrations/0001_init.sql` | Tables, RLS, and the private photo bucket |
| `supabase/functions/notify-on-entry` | Webhook target: push the *other* user when someone posts |
| `supabase/functions/daily-reminder` | Cron target: nudge anyone who hasn't logged today |

---

## ⚠️ iOS push notifications — read this

On iPhone, Web Push **only works when the app is installed to the Home Screen**
(iOS 16.4+). A normal Safari tab cannot receive notifications. So the flow is:
open the site in Safari → **Share → Add to Home Screen** → open GoodEats from the
home screen → Settings → **Enable**. (Web Push is also disabled on iOS in the EU; the
app still works fully without it there. Android/desktop Chrome have no install
requirement.)

---

## Setup

### 0. Install & run locally

```bash
npm install
cp .env.example .env.local   # fill in values from the steps below
npm run dev
```

### 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the **Project URL** and **anon public key** into
   `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 2. Create the database schema

Open **SQL Editor** in the Supabase dashboard, paste the contents of
`supabase/migrations/0001_init.sql`, and run it. (Or, with the
[Supabase CLI](https://supabase.com/docs/guides/cli): `supabase link` then
`supabase db push`.)

### 3. Create your two accounts (invite-only)

1. **Authentication → Providers → Email**: make sure email/password is enabled and
   turn **OFF** "Allow new users to sign up" (this keeps the app private to you two).
2. **Authentication → Users → Add user** → create an account for each of you
   (email + password, mark email confirmed).
3. For each user, add a profile row so names show in the feed. In SQL Editor:
   ```sql
   insert into public.profiles (id, display_name) values
     ('<user-1-uuid>', 'Your name'),
     ('<user-2-uuid>', 'Friend name');
   ```
   (Find the UUIDs in Authentication → Users.)

### 4. Generate VAPID keys (for push)

```bash
npm run vapid
```

- Put the printed `VITE_VAPID_PUBLIC_KEY` into `.env.local`.
- In Supabase, set the Edge Function secrets (**Project Settings → Edge Functions →
  Secrets**, or via CLI):
  ```bash
  supabase secrets set \
    VAPID_PUBLIC_KEY=... \
    VAPID_PRIVATE_KEY=... \
    VAPID_SUBJECT=mailto:you@example.com
  ```

### 5. Deploy the Edge Functions

```bash
supabase functions deploy notify-on-entry
supabase functions deploy daily-reminder
```

### 6. Wire up "notify when friend posts"

**Database → Webhooks → Create a new hook:**

- Table: `entries`, Events: **Insert**
- Type: **Supabase Edge Function** → `notify-on-entry`
- Method `POST`; it auto-includes the service-role auth header.

### 7. Schedule the daily reminder

In SQL Editor (enable the `pg_cron` and `pg_net` extensions first under
**Database → Extensions**). This example fires at 19:00 UTC daily — adjust the hour to
your timezone's evening:

```sql
select cron.schedule(
  'goodeats-daily-reminder',
  '0 19 * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR-SERVICE-ROLE-KEY>'
    )
  );
  $$
);
```

### 8. Deploy the frontend to Vercel

1. Push this repo to GitHub and import it at [vercel.com](https://vercel.com)
   (framework preset: **Vite**).
2. Add the three env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_VAPID_PUBLIC_KEY`) in the Vercel project settings.
3. Deploy. `vercel.json` already routes client-side paths to the SPA.

### 9. Install on your phones

On each iPhone: open the Vercel URL in **Safari** → **Share → Add to Home Screen** →
open **GoodEats** from the home screen → **Settings → Enable** notifications.

---

## Verifying it works

- Log in, tap **+**, take a photo, post it — it should appear in the feed instantly.
- On the other phone (installed PWA), you should get a push within a few seconds.
- Manually fire the reminder to test it:
  ```bash
  curl -X POST 'https://<PROJECT-REF>.supabase.co/functions/v1/daily-reminder' \
    -H 'Authorization: Bearer <SERVICE-ROLE-KEY>'
  ```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Local dev server (PWA enabled in dev) |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build locally |
| `npm run vapid` | Generate a VAPID key pair |
| `npm run generate-icons` | Regenerate PWA icons from `public/app-icon.svg` |
