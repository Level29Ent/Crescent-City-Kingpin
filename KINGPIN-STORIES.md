# Kingpin Stories & Empire

Open **Empire / M → Kingpin Stories**. This extends the existing story, public interiors, driving, living-city operations and navigation; it does not replace earlier saves or progression. No new dependencies, external art/audio downloads or hosted services.

## Branching campaign and takeover
Three additional chapters unlock after the original **A Crown of Broken Promises** finale:
- **The Harbor Compact:** protect relief routes or sell them to Crane's buyers.
- **A Friend at the Wrong Table:** expose a fixer's betrayal or bury the evidence. Exposing restores crew loyalty; taking money hurts it and brings retaliation closer.
- **The Price of a Crown:** publish the ledger for a coalition or keep it as leverage.

Each chapter has an on-site contact, an evidence encounter and a separate return address. Protect/profit choices persist and alter pay, heat, reputation and loyalty. Profit pays 40% more than $1,800 / $2,400 / $3,200 clean base and creates more heat. Each chapter pays only once. Guard kills belonging to these ventures grant **no kill cash**, so abort/retry cannot farm them.

Choose an encounter approach before starting: confront three guards (lethal or nonlethal), pay a $300 on-site fixer bribe, hold L / LOCKPICK on foot at the objective for eight uninterrupted seconds, or use a purchased disguise below 30 heat. Bribes charge once. Lock progress resets when released, out of range, driving or firing. The quiet alternatives retrieve evidence without spawning the assault squad; they are explicit route choices, not a full stealth sandbox.

After all new chapters, own all five turf corners, operate three properties and keep two paid loyal specialists to unlock the **citywide takeover**. Five separate three-guard retaliation encounters require travel and resolution, then a return to Mama Nola. The finale rechecks turf ownership, awards $8,000 once, and shows a persistent epilogue based on all-protect (**Crescent Coalition**), all-profit (**Iron Crown**) or mixed (**Bayou Broker**) choices. Continue Free Roam resumes play. Existing million-dollar/retirement progression remains.

During the arc, rival retaliation periodically uses the existing turf-defense system. Ignoring it can really lose a corner and its income. This is not a new independently simulated rival economy.

## Business activities
Operating owned venues expose activities in the board:
- **Club event** at jazz club, dive bar, record business or casino: $100 setup, collect equipment at Marigny, host at the venue for 25 outdoor seconds below 30 heat, then settle $550 clean.
- **Shipment** at dock, port, courier or chop shop: consumes two inventory crates upfront, load at your business, drive to the cargo office, then return for up to $1,100 clean. Collision damage reduces cargo condition and payout; zero cargo fails.
- **Protection deal** at a racket: needs paid loyal crew. Meet the shopkeeper, negotiate on-site for 15 seconds below 30 heat or clear two extortionists, then sign for $450 clean. Gunfire commits to combat; it cannot be erased by waiting one frame.

Each venue has a 240-second outdoor cooldown. Upkeep must remain paid at completion. Setup funds/cargo are not refunded on abandonment, death or expiry. There are no menu-only payouts or passive event rewards.

## Crew companions
Call one paid loyal specialist within 35m of Mama Nola. Follow, Hold and Retreat commands persist. The on-foot companion uses existing collision-aware paths, defends the player against nearby hostile gangsters, can be hit by enemy/friendly fire, and retreats to HQ when commanded. They do not teleport into cars or have a new vehicle boarding system; driving away can leave them behind. Unreachable routes stop safely.

Each of the six specialists has a once-only personal contact/rescue/return mission: two guards, +25 loyalty, $350 clean and improved field fire cadence/damage. Specialists retain their existing distinct passive/training bonuses; personal-mission structure is shared, not six bespoke voiced campaigns. Unpaid/disloyal companions withdraw. Incapacitation costs eight loyalty and 90 outdoor seconds of recovery; retreat or wage withdrawal also requires recovery, so recalling cannot instantly heal. Player death cancels ventures and withdraws companions.

## Atmosphere and mission tools
- Procedural **Jazz** and **Bounce** radio patterns, **News** captioned bulletins and **Off** are selectable. Districts use different ambient tonal accents and captioned conversation lines every 24 outdoor seconds. These are not licensed stations, recorded dialogue or voice acting. Audio uses existing volume/mute buses; music scheduling pauses with gameplay.
- Every 150 idle outdoor seconds after onboarding, a relief collection or threatened-witness event can appear. Relief costs $50 and grants trust; a witness requires clearing two pursuers for $150 and trust. No event starts over another tracked activity; each can expire or be abandoned.
- **T / TAKEDOWN:** crouch behind a gangster within 2.4m with line of sight. Subdues without kill rewards; does not target civilians, police or bosses.
- **G / DISTRACT:** $10 noise lure, seven seconds, 20-second cooldown. Nearby gangsters investigate its location instead of aiming at the player.
- **L / LOCKPICK:** hold at the active chapter's evidence encounter. This is a timed action, not a separate lockpicking minigame.
- **Disguise:** $100 at Royal Street Tailor's interior desk, 90 outdoor seconds. Changes outfit/hair visually without overwriting avatar customization. Shooting/new crime breaks it. It delays fresh personal detection only below 45 heat; never clears active pursuit/search or hides a reported car plate.

## Vehicle ownership and law
Street theft reports add eight heat once per car key and survive reload. Mission/tutorial vehicles are exempt. Owned cars get readable, uniquely labeled plate textures; plate revisions persist.

An owned car used at 60+ heat gets a reported plate. Actual police line of sight can recognize it later and restart heat/detection; no remote plate tracking. Dying while driving an owned car at 60+ heat impounds it before the normal death heat reset. Impounded cars cannot deploy, auto-run or upgrade.

Buy $250 insurance before trouble. Recover impounded cars at the precinct for $300 uninsured or $50 insured; insured recovery restores full condition, uninsured guarantees at least 30%. Replate an available car at HQ/chop-shop/garage below 30 heat for $120. Replating changes the rendered label and clears the report, not active pursuit. No manual plate text, external plate lookup, persistent street-car ownership or tow-truck simulation is claimed.

## Saves, controls and validation
New state restores with bounded defaults for older/malformed saves. Tracked ventures are exclusive with original work, operations, stories, side missions and daily routes. Starting a venture cancels an interrupted import contract without pay. Guard identities, progress, cargo, choices, companion health/commands, radio and law records persist; death/abandonment cleans up venture actors.

Touch actions include takedown, distraction and held lockpicking. Browser/real-device verification and long campaign/balance playtests are recorded separately in the PR. Automated tests check economics and mission rules, not cinematic polish or subjective story quality.
