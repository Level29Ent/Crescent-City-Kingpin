// Explicit mission handoff: a mission must leave safe interiors and all menu/pause states.
export function missionSession() {
  return { playing: true, managing: false, shopOpen: false, balcony: false };
}
export const INTRO_SHOTS = [
  { title: 'AFTER THE FLOOD', text: 'The city survived. Now everyone wants a piece.', from: [70,48,125], look: [0,3,0] },
  { title: 'CRESCENT CITY', text: 'Neon nights. Old loyalties. A new empire.', from: [-40,20,-70], look: [20,3,-30] },
  { title: 'WRITE YOUR OWN LEGEND', text: 'Every empire begins with a name. Choose who you become.', from: [6,7,12], look: [30,1,4] },
] as const;
export function introShot(elapsed: number) { return Math.min(INTRO_SHOTS.length-1,Math.max(0,Math.floor(elapsed/4))); }
