# Splitzy

[![Unit Tests](https://github.com/aurmartin/splitzy/actions/workflows/ci.yml/badge.svg)](https://github.com/aurmartin/splitzy/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/aurmartin/splitzy/graph/badge.svg?token=HMW2DSCAOV)](https://codecov.io/gh/aurmartin/splitzy)

A local-first, AI-powered expense splitting app that works offline. Built with React Native and Expo.

## Screenshots

<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
  <img src="assets/images/splitzy-mockup/Apple iPhone 14 Plus (1284x2778)/Apple iPhone 14 Plus Screenshot 1.png" width="200" />
  <img src="assets/images/splitzy-mockup/Apple iPhone 14 Plus (1284x2778)/Apple iPhone 14 Plus Screenshot 2.png" width="200" />
  <img src="assets/images/splitzy-mockup/Apple iPhone 14 Plus (1284x2778)/Apple iPhone 14 Plus Screenshot 3.png" width="200" />
</div>

## Features

- 💡 **Smart Scanning**: AI-powered receipt scanning that automatically detects items
- ⚡ **Local first**: Split expenses anytime, anywhere - no internet required
- 👥 **Group Friendly**: Create unlimited groups for trips, roommates, or events
- 💸 **Flexible Splitting**: Split bills equally, by percentage, or custom amounts
- 🔄 **Real-time Sync**: Instantly sync expenses between devices using WebSocket

## Tech Stack

- React Native with Expo
- SQLite for local storage
- Supabase for remote storage
- Google Generative AI for receipt scanning

## Local development with Supabase

In development the app talks to a local Supabase stack: `.env.development` points `SUPABASE_URL` and `SUPABASE_ANON_KEY` at it. It needs Docker. The schema comes from `supabase/migrations`, so the local database always matches the versioned schema.

```bash
pnpm db:start     # start the local stack and apply the migrations
pnpm ios          # build and run the app as usual
pnpm db:login     # sign in as dev@splitzy.local in the booted iOS simulator
```

- `pnpm db:login [email] [simulator]` creates the user if needed, signs in with a magic link token through the admin API and opens the app with that session, so no email is sent. Pass a simulator name or UDID when several are booted. Signing in from the app's login screen does not work locally: auth emails go through the hosted SMTP settings in `supabase/config.toml`.
- `pnpm db:offline` / `pnpm db:online` stop and restart the local API gateway, which cuts every simulator off the backend at once. Local writes stay in the sync queue and are sent once the backend is back.
- `pnpm db:reset` recreates the local database from the migrations. `pnpm db:stop` stops the stack.
- Receipt scanning goes through `SERVER_URL`, which checks sessions against the hosted project, so it does not work with a local session.

### Testing sync with two simulators

1. Boot two simulators and install the dev build on both, for example `pnpm ios --device "iPhone 17"` then `pnpm ios --device "iPhone 17 Pro"`.
2. Sign in as two users: `pnpm db:login alice@splitzy.local "iPhone 17"` and `pnpm db:login bob@splitzy.local "iPhone 17 Pro"`.
3. Create a group on the first one, then open the share link on the second, or run `xcrun simctl openurl "iPhone 17 Pro" "splitzy-dev://protected/groups/<group id>/import"`.
4. Use `pnpm db:offline`, make changes on both, then `pnpm db:online`. Pull to refresh on the group screen to fetch what the other device sent while its realtime connection was down.
