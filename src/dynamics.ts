// Small, deterministic rules shared by the simulation and regression checks.
export type Reserve = { value: number; exhausted: boolean };
export function updateReserve(reserve: Reserve, requested: boolean, dt: number, drain: number, refill: number): boolean {
  if (reserve.exhausted && reserve.value >= 25) reserve.exhausted = false;
  const active = requested && !reserve.exhausted && reserve.value > 0;
  reserve.value = Math.max(0, Math.min(100, reserve.value + (active ? -drain : refill) * dt));
  if (reserve.value === 0) reserve.exhausted = true;
  return active;
}

export function cityClock(time: number) {
  const hour = (18 + time / 40) % 24; // A full city day lasts sixteen minutes of play.
  const daylight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
  const dusk = Math.max(0, 1 - Math.abs(hour - 18) / 2);
  const label = hour < 6 || hour >= 20 ? "AFTER HOURS" : hour < 9 ? "SUNRISE" : hour < 17 ? "DAYLIGHT" : "GOLDEN HOUR";
  return { hour, daylight, dusk, label };
}

export function demandIndex(time: number, destinations: number): number {
  return Math.floor(time / 90) % destinations;
}
export function deliveryPay(distance: number, streak: number, priority: boolean): number {
  const multiplier = (1 + Math.min(5, Math.max(0, streak)) * 0.1) * (priority ? 1.5 : 1);
  return Math.round((500 + distance * 6) * multiplier);
}
export function deliveryBonus(pay: number, remaining: number, duration: number): number {
  return Math.round(pay * 0.25 * Math.max(0, Math.min(1, remaining / duration)));
}
