# Gameplay bug audit

This is a stabilization pass over the merged city/story updates, not a promise that every possible runtime or balance issue is eliminated.

## Reproduced rule/save defects

- Companion recovery was restored only when the saved companion ID was an active specialist. Injury clears that ID, so reloading reset the 90-second recovery to zero. Empty-ID companion state now retains bounded health/location/recovery.
- A completed daily route could be restarted on the same UTC date for another $1,000. Same-date restarts are rejected and shown completed on the board; a new date can start normally. Daily/side-mission start functions now enforce tutorial and activity-exclusivity rules, not just disabled UI controls.
- Quiet operations checked firing, heat and expiry only during the next simulation tick. Interacting before that tick could still pay. The interaction boundary now rejects/clears failed operations too. Destroyed shipment settlement likewise fails without recording a business win.
- The adaptive graphics sampler retained partial frame windows across pauses. Paused/loading intervals now clear the window and hysteresis sample counts.

The initial seven audit tests failed against the merged code and passed after these changes. Existing mission/daily fixtures were updated to explicitly finish onboarding before testing unlocked activities; their reward assertions remain.

## Integration/control fixes

- E exits an activity vehicle unless the player is at a valid driving-objective interaction (correct recovery car/condition, actually boarded rescue passenger, or live shipment drop). Rescue pickup/wait messages no longer trap the player inside a car. Recovery-car boarding takes priority over its co-located public doorway.
- Car exit tries both doors, wider offsets and front/rear alternatives, and refuses to place the player inside geometry if no safe exit exists. Canceled recovery-car cleanup waits for a safe exit instead of disposing the car under its occupant.
- Fatal crash processing returns immediately after death/impound rather than continuing to animate a disposed rig or run over nearby actors. A car left by death is stopped, and police cruiser callbacks cannot deploy officers after a fatal traffic hit.
- District-boss progression is separate from direct-player kill rewards. Clearing ordinary district rivals through nonlethal takedowns or companion fire now unlocks the boss; mission guards and already-captured districts do not. No kill cash is granted for nonlethal/allied defeats.
- Impounded cars cannot consume tire-upgrade funds/parts, matching engine/armor/deployment restrictions.
- Rescue boarding uses a stable vehicle key instead of a mutable array index. Cached cover is cleared when a guard is distracted so it cannot restore firing behavior during the lure.
- Joystick pointer distances are converted from screen pixels to local layout pixels before moving the knob, keeping scaled controls aligned with the finger. The HUD now measures actual scaled action/joystick height instead of assuming the old nine-button grid. The takeover epilogue renders above the gameplay HUD.

## Verification and remaining boundaries

Focused behavior checks cover save/reward/start gates, valid activity car exits, collision-free disembarking, district progression, scaled joystick math and impounded tire tuning. The full suite, TypeScript and production build are run before publication. Browser and mobile rendering, audio and extended real gameplay require the exact-head preview; status is recorded in the PR.
