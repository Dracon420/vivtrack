# VivTrack

**An exotic pet tracker for reptile, amphibian and invertebrate keepers.** It's an installable web app (PWA) that
works offline and syncs to the cloud when you sign in.

**Live app:** https://vivtrack.vercel.app

---

## What it does

- **Animals:** a profile for every animal with photos, weight history and charts, sheds, feedings and notes. A
  *Quick log* records a feeding or weigh-in in a couple of taps.
- **Enclosures:** each vivarium with its animals, plants and care tasks, plus automatic misting reminders.
- **Scan to open:** print a QR code or write an NFC tag for each enclosure. Scanning it opens that enclosure's
  page on your phone.
- **Species guide:** care sheets with temperature, humidity and diet ranges.
- **Bioactive plants** and **feeder colonies** (roaches, isopods, springtails and the like).
- **Breeding:** pairings, clutches and hatch dates.
- **Medications** and **expenses**.
- **Tasks:** a dashboard of what's due today.
- **Feeding calculator.**
- **Export:** PDF reports and a full data export.
- **Photo library**, light and dark themes, and push reminders.

Data is stored on the device first (IndexedDB), so the app keeps working without a connection.

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Supabase (auth, sync and storage), Zustand, Zod,
Recharts and jsPDF. Payments for the Pro tier go through serverless functions in `api/`, for Stripe, Paddle or
Lemon Squeezy, deployed on Vercel.

## Run it yourself

```bash
npm install
npm run dev
```

Create a `.env.local` with:

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | sign-in and sync |
| `VITE_VAPID_PUBLIC_KEY` | push notifications |
| `VITE_APP_URL` | links in payment flows |

The database schema is in [`supabase/schema.sql`](supabase/schema.sql). The payment functions in `api/` also
need their provider's keys (`STRIPE_*`, `PADDLE_*` or `LEMONSQUEEZY_*`) and `SUPABASE_SERVICE_ROLE_KEY`, set as
server-side environment variables. **Never** put those in a `VITE_` variable, because anything with that prefix
ends up in the browser.

```bash
npm run build     # production build in dist/
npm run lint
```


---

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md). You're free to use, study and change it for personal, hobby, educational and other **noncommercial** purposes. **Commercial use, including selling it or running it as a paid service, isn't allowed** without a separate licence from the author; open an issue to ask.
