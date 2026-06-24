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
| `src/pages/Feed.tsx` | Home: combined feed of both people; tap a name/avatar to open their profile |
| `src/pages/Profile.tsx` | A person's profile as an Instagram-style photo grid; tap a post to view/edit/delete |
| `src/pages/Add.tsx` | Pick up to 10 photos → compress each → upload to Storage → insert row |
| `src/components/PhotoCarousel.tsx` | Swipeable multi-photo carousel (dots + counter) used on cards |
| `src/pages/Settings.tsx` | View your profile, enable notifications, iOS install hint, sign out |
| `src/lib/entries.ts` | Shared data helpers (fetch / edit caption / delete), realtime-backed |
| `src/sw.ts` | Service worker: offline shell + `push` / `notificationclick` handlers |
| `supabase/migrations/*.sql` | Tables, RLS (incl. caption-edit policy), and the private photo bucket |
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

### 2. Link the CLI and push the schema

The Supabase CLI is installed as a dev dependency, so use the npm scripts (each
just wraps `npx supabase …`):

```bash
npm run sb:login                # opens a browser to authenticate (one-time)
npm run sb:link                 # links to project pivsplitiahvcmqywgnh (asks for DB password)
npm run db:push                 # runs supabase/migrations/0001_init.sql on your project
```

> `sb:login` is interactive — if it doesn't open automatically, run it from your
> terminal directly. (Prefer the dashboard instead? Paste
> `supabase/migrations/0001_init.sql` into the SQL Editor and run it.)

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
  npx supabase secrets set \
    VAPID_PUBLIC_KEY=... \
    VAPID_PRIVATE_KEY=... \
    VAPID_SUBJECT=mailto:you@example.com
  ```

### 5. Deploy the Edge Functions

```bash
npm run functions:deploy        # deploys notify-on-entry and daily-reminder
```

### 6. Wire up "notify when friend posts"

**Database → Webhooks → Create a new hook:**

- Table: `entries`, Events: **Insert**
- Type: **Supabase Edge Function** → `notify-on-entry`
- Method `POST`; it auto-includes the service-role auth header.

### 7. Schedule the daily reminder

Use **Supabase Cron** — it enables `pg_cron`/`pg_net` for you, so there's no extension
to hunt for:

1. Dashboard → **Database → Cron Jobs** (a.k.a. **Integrations → Cron**) → **Create job**.
2. Name: `goodeats-daily-reminder`. Schedule: `30 1 * * *`.
3. Type: **Supabase Edge Function** → select `daily-reminder` (method `POST`).
4. Save. The dashboard handles the HTTP call and auth automatically.

This fires daily at **01:30 UTC = 8:30 PM EST**. Cron runs in UTC and doesn't follow
daylight saving, so during EDT (summer) it lands at 9:30 PM local — change the schedule
to `30 0 * * *` if you'd rather keep it at 8:30 PM during summer. The function only
reminds people who haven't logged a meal yet **that Eastern day**.

<details>
<summary>Prefer raw SQL instead of the dashboard?</summary>

Enable `pg_cron` + `pg_net` under **Database → Extensions**, then run:

```sql
select cron.schedule(
  'goodeats-daily-reminder',
  '30 1 * * *',
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

</details>

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
| `npm run sb:login` | Authenticate the Supabase CLI (one-time) |
| `npm run sb:link` | Link the CLI to your Supabase project |
| `npm run db:push` | Run migrations against your linked project |
| `npm run db:new <name>` | Create a new migration file |
| `npm run functions:deploy` | Deploy both Edge Functions |
| `npm run sb:start` / `sb:stop` | Run/stop the full Supabase stack locally (needs Docker) |
