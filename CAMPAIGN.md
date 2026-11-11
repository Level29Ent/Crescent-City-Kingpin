# Crescent City Kingpin — empire expansion

## Playing

- **WASD / arrows:** move, **mouse:** look (pointer-lock or drag fallback), **left click:** fire, **right click:** aim, **Shift:** sprint/nitro, **E:** interact, **1–3:** weapons, **Esc:** pause, **M / Empire button:** management.
- Touch devices have held movement/action buttons. Drag the rendered city to look. On small screens management panels scroll.
- Choose gender, race/heritage, independently selected skin tone, outfit and hair from **Choose Character** or **Empire → Character**. Identity choices have no statistical advantage or penalty.
- Starter cash is $300 **clean**. Mama Nola's is a safehouse, not an automatic money faucet. Only captured neighborhood corners produce passive **dirty** cash. Kills and deliveries also pay dirty cash; police kills do not pay a bounty.
- Use **Turf** to select Skidrow, Warehouse District, Uptown, Frenchmen Corner or Bayou Landing. A white minimap waypoint guides you there. Get within 14 m on foot and press E / Fight. Kill all three guards to capture it. A legacy district boss also grants that district's corner if not already owned.
- Corners earn per minute and generate heat. Random rival defense events stop the affected corner's income. Respond on-site within 90 seconds or dispatch paid, loyal crew. Failing loses that corner and loyalty. Offline progress does not roll additional defense/raid events; existing defense timers resume on return.
- Hire one each of the Enforcer, Hacker/Safecracker and Smuggler in **Crew**. Each has distinct bonuses. Wages are charged per **24 real hours** of accumulated online/offline time (not the accelerated visual city day). Arrears or loyalty below 25 disable bonuses. Pay arrears or give a loyalty bonus to restore service.
- **Market** shows your actual district's buy/sell prices plus district comparisons. Buy with clean funds, sell for dirty cash. The 15% spread prevents immediate same-market profit. Demand changes every 90 simulation seconds; port blockades, crew wars, police crackdowns and festivals affect prices. Warehouse heists are a probabilistic management action at the warehouse, not a separate stealth mission.
- At 30 heat informants appear; 60 triggers physical patrol roadblocks with officers; 85 triggers precinct raids seizing 20% of dirty cash and half the goods. Interventions are checked every 75 simulation seconds. **Safehouse** provides informant bribes, paid heat reduction and an 80%-return laundering desk. Laundering/high-tier upgrades require physically visiting Mama Nola's.
- Only clean funds buy high-tier upgrades, gear and crew wages. Achievements unlock automatically, once each. Cleaning $5,000 permanently adds 5% corner revenue.

## Persistence and offline progress

Campaigns save every 30 seconds, on management changes, tab hide and unload, and via **Settings → Save Game**. localStorage is the synchronous copy; IndexedDB is a serialized mirror. The newest valid copy wins. A failed copy does not discard the other; manual save reports availability. Saves are local to the browser and deployment origin, not cloud accounts. This is a new versioned save format; the previous game had no campaign saves to migrate.

Saves include clean/dirty funds, stats, character, corners, crew loyalty/arrears, goods, heat, achievements, settings, position, weapons, boss/district progress and surviving rivals/active turf guards. Sessions resume on foot; an interrupted timed delivery counts as one failed mission. Cars reset to their original parking spots.

Offline earnings are 35% of current corner revenue, capped at 24 hours, plus 10% of normal turf heat generation. Wages are processed for elapsed daily boundaries. No turf means zero offline income. Earnings are saved immediately after applying them to prevent double claims on reload. Hidden-tab time is handled once on return. Reset requires typing RESET and clears both stores; a local reset timestamp prevents an older backup from resurrecting progress.

## Optional global leaderboard backend

The global leaderboard API (`/api/leaderboard`) is implemented but **requires a shared Redis database**. It responds with 503 and the UI clearly says “not connected” until configured. There is no mock global leaderboard and no in-memory serverless persistence.

Connect an Upstash Redis integration to the project using https://vercel.com/marketplace/upstash/upstash-kv and select your preferred plan/database. Set the following as **server-side project environment variables**, not VITE-prefixed variables, then deploy a new preview/production build:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Never commit credentials or send them through chat.

Players explicitly opt in by submitting an alias with Total Cash Cleaned, Corners Captured and Max Heat Survived. The endpoint validates payloads, rejects cross-origin submissions, bounds request size and scores, stores network identifiers only as short-lived rate-limit hashes, limits submissions to one per minute per network, and keeps the top 1,000 per metric. It displays the top 20. A secure HttpOnly cookie maintains a browser's leaderboard entry. Alias records expire after 30 days. These are **self-reported single-player scores**, not anti-cheat authoritative rankings; clearing cookies or editing a local save can bypass identity/integrity expectations. Real competitive rankings would require authenticated accounts and server-authoritative gameplay.

## Checks (Node 24+)

```sh
npm install
npm test
npm run typecheck
npm run build
```

Tests cover zero-income idle behavior, corner income/defenses, crew pay/loyalty, market spread/events, laundering/rewards, heat/heists/safehouse, offline caps/wages, persistence fallback/reset and API validation/rate limiting. Backend tests mock Redis; a live connected database still needs integration testing.
