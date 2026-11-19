# Action controls & the Meridian campaign

This is an original, bounded arcade open-world expansion inspired by familiar crime-sandbox controls. It does not reproduce GTA V's campaign, assets, physics engine, world scale or mission count.

## Shared controls and every existing mission

Default keyboard controls:
- **Space:** jump outdoors on foot (10 stamina); service brake when driving.
- **Z:** short directional dodge outdoors on foot (18 stamina, 1.2s cooldown). Uses movement direction, otherwise camera-forward. Horizontal collision remains active; no invulnerability or wall traversal.
- **Q / WEAPONS:** paused, mouse/touch/keyboard weapon selector. Locked weapons remain unavailable; choose an owned weapon or Escape/Q to return. Number keys stay available. Aiming + mouse wheel cycles owned weapons; otherwise wheel changes camera distance.
- **X:** change over-shoulder camera side. Aimed walking is slower; aiming does not waste sprint stamina. Jump/dodge have their own procedural poses.
- **F / VEHICLE:** enter the closest accessible stopped vehicle or exit via a clear door. E remains the contextual mission/door action. Original onboarding and impound/run gates still apply.
- **Shift:** hold sprint/nitro; **B:** handbrake; **R:** reload; **C:** crouch/cover; **T:** nonlethal takedown; **G:** distraction; **E:** interact/held objective. New actions can be rebound without losing older customized bindings.

Touch adds jump, dodge, vehicle, shoulder and weapon-selector buttons. Contextual hiding removes foot-only controls in a vehicle, driving-only brakes on foot, and combat controls indoors. The existing joystick scaling, handedness, opacity and sensitivity settings remain. Touch held objectives have explicit pointer capture/release/cancel handling. No controller/gamepad support is claimed.

All existing tracked story, work, operation, pursuit, side-mission, heist and venture families now use a shared contextual instruction strip. Objective-stage changes reannounce the new objective with the existing portrait/cue. Import deliveries, daily routes and turf defense also have guidance. Existing mission locations, rewards, prerequisites, single-payout gates, timers and replay/checkpoint eligibility are preserved—not silently replaced by a new generic mission. A police detection/search progress indicator exposes the existing line-of-sight system; this does not add helicopter AI or unseen tracking.

Driving retains distinct vehicle classes, condition, collision and handbrake mechanics, with faster steering return and reduced high-speed steering sensitivity. This is kinematic arcade handling, not GTA's rigid-body suspension/destruction.

## New six-chapter story

Finish (or explicitly skip) the opening tutorial. Visit **Mama Nola's back desk → Contact**, choose the next available Meridian chapter under **Local conversation**, and accept there. GPS never accepts it remotely.

1. **The Last Honest Fare** — dispatch witness, driving route, recover a dispatch bag, report back ($1,100 clean).
2. **Dead Frequency** — meet Switch, quietly download the repeater key, drive it to the newsroom, report ($1,600).
3. **Broken Convoy** — meet June, resolve the port crew, recover a manifest, escape police, report ($2,400).
4. **False Friends** — meet Brick, drive to the station ambush, recover the financier ledger, report ($3,000).
5. **The Meridian Score** — meet Ledger, quietly copy codes, open the street-side courier safe, clear the response, drive the exchange route and escape ($4,200).
6. **The City We Keep** — final command-crew fight, upload the evidence, escape, then choose **Publish the ledger** or **Keep the leverage** in Objective and report ($6,000; Keep adds $2,000 but adds heat and costs crew loyalty; Publish raises neighborhood trust).

These are complete short, written-dialogue missions on the existing map: travel/contact, held interactions, low-heat/no-gunfire stealth checks, tagged encounters, driving handoffs and real police escape. The convoy is a seized-manifest encounter, not a moving escort convoy; there are no new voiced cutscenes, motion-captured cinematics or drivable new districts. The new courier-safe score is distinct from the previous playable interior bank/riverboat heists, which remain available.

Every new chapter pays once and unlocks the next. All enemies are activity-tagged and give no extra kill cash. Quiet/hold actions require presence, on foot, no firing and uninterrupted Interact; quiet adds heat below 30. Driving handoffs require a car stopped below 2m/s. Escape requires heat cleared at the destination. Existing police combat and the game world's standard death penalties still apply.

Each Meridian stage has a ten-minute timer. Stage transitions checkpoint only the mission ID, stage and choice—not balances, inventory or defeated ordinary enemies. Death, expiry, abandonment or reload ends the attempt without payout. On the street on foot, **Objective → Retry campaign stage · $50** restarts the saved stage with fresh encounter/timer/health and no refunds. An active job, defense, practice or insufficient funds prevents retry. Completing a chapter invalidates its checkpoint. Completed chapters appear in the existing HQ **Polish & Replays** practice system, whose rewards and choices never persist.

Version-2 saves receive safe defaults. Reload preserves completed chapter IDs, final decision and a bounded stage checkpoint; the interrupted attempt and its temporary enemies do not resume as ordinary reward-bearing rivals.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`. Tests cover all chapters/stages, physical acceptance, exclusivity, driving/combat/escape/held-action gates, both ending effects, single rewards, retries/reload/death, isolated replay, key migration, jump/dodge stamina and cooldown, selector ownership/context gates, all existing mission families and legacy regressions. Browser coverage is recorded in the PR and does not imply a full six-chapter/mobile-device playthrough.
