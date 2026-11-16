# City Pursuits expansion

Open **Empire / M → City Pursuits**. The board connects activities, customization, crew bonds and business rivalries to the existing city/save systems. No new dependencies, external art/audio or network services.

## Street races
Two routes—Canal Midnight Circuit and Levee Freight Sprint—have five sequential raw street checkpoints, $75/$100 entry fees, $600/$850 win payouts, fixed rival pace targets and 130s/150s limits. Enter the checkpoints in the same road vehicle. A translucent non-colliding pace car shows the target timeline; it is not a second physics-driven AI racer. Beat 95s/110s to win, or finish within the limit for 40% pay. Best times/win records persist. A 60-second outdoor cooldown prevents immediate repeats.

The race timer includes travel from acceptance, so approach the start first if you want a competitive time. Missed checkpoints do not advance. Failure/abandonment never refunds the entry fee. Reloading cancels a vehicle-bound race without payout/refund rather than letting a recreated car bypass the same-vehicle rule. Existing traffic/police and collision remain active. Race routes are time trials, not a tournament or new racing physics engine.

## Taxi work
Three fares connect jazz/clinic, gallery/cafe and port/dispatch addresses. Pickup/delivery requires an actual Crescent City Taxi, stopped below 1.5m/s. The passenger appears at pickup then in the passenger seat. Fare care starts at 100%; collisions and player gunfire reduce the $320/$420/$380 maximum pay (floor is half base for a completed fare). Timer is 200s. Leaving/switching the assigned taxi returns the passenger to pickup while the timer continues. Reload requires pickup again, never a phantom delivered passenger. Settlement pays once, followed by 45s cooldown.

The passenger uses the existing procedural civilian rig; these fares do not add a dialogue/independent passenger-combat simulation. Public street taxis can be reported stolen under the existing law system; garage-owned taxis avoid that theft event.

## Bounties and fishing
- Three one-time bounty contracts (Lark, Moss, Vale) pay $700/$900/$1,200 clean. Resolve the marked three-person target/guard group, collect proof on-site and return to Mama Nola. Lethal combat, takedowns and accepted surrender all count. City-pursuit guard kills give no separate cash, and completed contracts cannot be restarted for duplicate pay.
- Levee fishing takes place on the actual walkable casino-access pier at (35,196). $15 tackle upfront. Interact on foot to cast, wait for a 3–6s bite, then Interact during the visible 1.8s bite window. Miss/expiry pays nothing; landed catches cycle $65/$95/$140 clean, followed by 30s cooldown. This is a timed fishing activity, not a water/rod physics simulator.

All new activities share one slot with stories, operations, work, daily routes and ventures. Acceptance requires completed onboarding; imports are canceled without payout by the existing mission handoff. Death cancels the new activity. Practice still blocks campaign persistence; the new activities do not create replay/leaderboard rewards.

## More world to enter
Four new signed public instanced visits bring the room/annex catalog to **51**:
- Royal Quarter Rooftop: open sky, skyline blocks, railings and planters.
- Tremé Sky Garden: open-sky rooftop garden dressing and plant-lined edges.
- Levee Waterfront Pavilion: river backdrop and timber seating.
- Eastbank Rail Exchange Market: warehouse/market stock and exchange dressing.

They appear in Buildings and City Map with tested distinct reachable facade approaches. Rooftops are instanced transitions, not free climbing or holes cut into existing facades. Waterfront/Rail Exchange are named neighborhood annexes within the existing map; **this does not add streamed city districts or extend the overworld boundaries/traffic graph**. Outdoor economy/combat pauses during visits as before. Existing supply claims and public-service rules remain; entry does not buy a property.

## Customization
- Three purchased wardrobe looks: Riverboat evening coat ($250), Canal racing jacket ($350), Dockworker field jacket ($200). Outfit palettes/hair presets plus visible garment trim apply to the live player, indoors and in character previews; original avatar identity/stats remain unchanged. Temporary disguises take visual priority. Equip an owned look or return to the original free character outfit.
- Purchase the three existing courtyard/shotgun/loft apartment visits for $1,800/$2,200/$2,600. Ownership is cosmetic/home progression only—no passive income or free property bonuses. Choose among three $80 decor palettes/rugs with bed/art dressing on next entry. Public visits remain possible before purchase.
- Rally/checker/sunset liveries cost $180 per change; removing is free. On stored-car deployment, side/tank accents appear alongside existing garage styling; impounded cars cannot be restyled. These are procedural accents, not externally sourced custom texture uploads. Resources are disposed with their rigs.

## Crew relationships and business rivalries
Paid loyal specialists can have a Listen or Reward conversation. Listening gives +5 bond/+2 loyalty; $100 reward gives +10 bond/+5 loyalty. The shared 120s outdoor cooldown prevents repeated-click farming. Bond caps at 100 and adds one field-damage point per 25 bond to that companion (maximum +4), on top of existing personal-mission progression. Dialogue uses short specialist-named responses, not branching romance/voiced relationship campaigns. Wage/loyalty gates and injuries still apply.

Every 120 outdoor seconds, operating businesses gain 10 rivalry pressure. Pressure reduces real dirty-property revenue by up to 25%; disabled businesses and existing crew/ownership gates still work. At 20+ pressure, accept a three-rival contest at that business, resolve it and settle with staff for $500 and cleared pressure. Pressure is not a hidden purchase or passive payout. Cafe clean revenue and front capacity are unchanged.

## Distinct bosses
Existing district bosses now have separate telegraphed patterns:
- Tremé brawler: closes to melee range, short windup, heavy close-range cone hit.
- Garden marksman: long windup, narrow long-range shot, recovery window.
- Docks gunner: three-shot burst then longer recovery.
- Bayou ambusher: faster repositioning and medium-range attacks.

Windup locks the attack heading. HUD warns; dodging out of the cone or breaking sight prevents the released attack. Generic enemy gunfire is suppressed for bosses so the pattern does not double-shoot. These are procedural patterns using existing cover/pathfinding, not four new cinematic boss arenas. Original story bosses use the existing district/default pattern. Boss progression/rewards remain subject to the existing one-time district/story rules.

## Validation and boundaries
New tests exercise activity stakes/exclusivity/vehicle/pickup/bite/combat/proof/cooldown/single-payout rules, race reload cancellation, owned customization save guards, crew bond cooldown, real rivalry revenue effects, boss timing/cone behavior, map/real street checkpoint clearance, removable wardrobe/livery resources and board hooks. Existing tests instantiate every room and verify doors and uninterrupted supply/desk/exit paths, including all new annexes. Older saves receive bounded empty/default state.

Full tests, TypeScript and production build are run before publication. Browser/mobile rendering, actual race/fare/fishing feel, boss balance and long economy playtests still require the PR head’s preview; deployment/verification status is recorded in the PR. Passing rule tests do not prove visual or real-device performance.
