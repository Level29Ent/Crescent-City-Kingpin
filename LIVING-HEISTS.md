# Living streets, shop hold-ups and playable heists

## How to play

- Finish or skip the existing opening tutorial. Visit Mama Nola's signed door on foot, walk to the back desk and Interact. In **Contact**, choose **The Brass Vault** or **River Queen Casino Heist** from **Local conversation**. These are new playable jobs; the original probabilistic Heists remain separate and unchanged.
- Bank setup costs $150 clean, the River Queen $250. The Queen needs an equipped Riverboat evening coat (purchase at the tailor/barber) or an active purchased disguise. Successful major jobs are one-time per campaign: $4,200 / $6,500 dirty loot before the existing storage cap.
- Travel to the named entrance and enter. Hold E (or the new touch/mouse **HOLD · INTERACT** button) at green alarm controls for 3 seconds, brass vault controls for 8, then the rear loot/register marker for 5. Movement away or releasing resets that action. The lobby camera trips after 25 seconds spent inside without disabling it. **FORCE VAULT · TRIP ALARM** at the vault controls skips disabling cameras, raises heat and alerts security.
- Alerted security pursues on foot and causes close-range damage. E nearby subdues the guard. Customers panic toward the exit and cannot be shot; indoor gunfire remains disabled. This is an arcade timed lock/control interaction, not a new ballistics or procedural safecracking engine.
- The bag is carried visibly on foot, not credited immediately. Leave, board a getaway car, escape wanted heat and return on foot to Mama Nola's street entrance; Interact to settle once. Death, expiry, abandonment or reloading before settlement loses the bag; setup fees are not refunded. Timers continue indoors during the job, but ordinary outdoor economy/pursuit still pauses there. Hiding inside never clears wanted heat.
- River Queen's **Services** desk offers normal five-card draw at $25 clean per hand with the existing payout table/hold/draw rules. No safehouse table purchase needed at this venue. No poker during an active raid, no real-money gambling. It is a signed instanced moored-casino room with nautical dressing, not a drivable boat, streamed river district or animated cruise.

## Shop robberies & more interiors

Eight new signed, reachable visits bring the interior catalog from 51 to **59**: Rampart Corner Market, Royal Crown Jewelers, Basin Bottle Shop, Canal Pharmacy, Bywater Electronics, Marigny Evening Boutique, Eastbank Gold & Pawn and River Queen Casino. All appear in the existing City Map building directory.

Twenty existing/new shops expose **HOLD UP REGISTER** when you stand at their rear register with no tracked activity. Hold Interact there for 4 seconds to bag $180–$400 dirty. Holding up a shop raises heat and lowers neighborhood reputation. The same getaway/escape/return rules apply. Site recovery is 240 simulation seconds; global completion/failure cooldowns remain. Neither home visits, HQ nor the charity clinic can be robbed. Recovery and successful major-heist records survive saves, while interrupted jobs cancel without payout.

Business rooms have one cashier and up to four moving, non-blocking customers; private homes have no crowds. Bank/Queen add one security guard. People use the existing procedural character rigs and collision-tested indoor movement, not voiced conversations or persistent individual daily schedules. Room-owned resources are released on exit.

## Crew, racing & neighborhood changes

- One existing paid/loyal **Follow** companion can board a nearby stopped car after 0.8 seconds, appears seated while it moves, and exits at a collision-free location when the player exits or changes command. Motorcycles have no passenger seat. Taxi/rescue passengers reserve the only seat; companions stay on foot. Existing injury, wages, loyalty and on-foot combat rules still apply. No new companion drive-by attacks or autonomous getaway driver is claimed.
- Both street routes now spawn two opaque driving opponents after the starting checkpoint. They use the directed road network, acceleration, junction steering, traffic braking and contact slowdown rather than interpolating a ghost along a clock. First rival finish determines win/40%-finish pay. Timing starts at the first checkpoint; travel still consumes the original acceptance time limit. Same-car/checkpoint/reload gates remain. These are bounded kinematic drivers, not a rigid-body racing engine or citywide tournament.
- Five corner banners switch purple → turquoise on ownership, red when contested. Owned corners gain a visible decorative crew sentry. Eight storefronts gain locals; inactive owned shops hide their customers. These bounded decorative actors add no income, combat bonus, simulated customer economy or new property ownership.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`. Tests cover both heist chains, spatial/held actions, setup/disguise/activity gates, dirty-only single settlement, getaway and heat requirements, timeout/death/reload, cooldown migration, all 59 distinct facade approaches and room aisles, customer panic/guard subdual, both opponent routes/collision clearance, traffic braking, real companion boarding/seat priority, poker stakes and ownership dressing disposal.

The game is reachable signed out. Browser checks can use the normal Settings save import/export UI with a locally generated version-2 campaign (`newCampaign` / `encodeSave`) at a chosen facade. This changes only browser-local test progress, not backend accounts. Never import over a player's real save for testing. Browser coverage and any unverified flows are recorded in the PR; simulation tests do not prove GPU performance, touch feel or full campaign balance.
