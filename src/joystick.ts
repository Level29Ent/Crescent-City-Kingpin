export function joystickVector(dx: number, dy: number, radius: number, deadzone = .12) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || radius <= 0) return { x: 0, y: 0, knobX: 0, knobY: 0 };
  const length = Math.hypot(dx, dy), amount = Math.min(1, length / radius);
  const strength = amount <= deadzone ? 0 : (amount - deadzone) / (1 - deadzone);
  const scale = length ? strength / length : 0;
  return { x: dx * scale, y: -dy * scale || 0, knobX: length ? dx / length * amount * radius : 0, knobY: length ? dy / length * amount * radius : 0 };
}
export function mountJoystick(element: HTMLElement, enabled: () => boolean) {
  const knob = element.querySelector<HTMLElement>('.joystick-knob')!;
  const value = { x: 0, y: 0 };
  let pointer: number | null = null;
  const reset = () => { pointer = null; value.x = value.y = 0; knob.style.transform = 'translate(-50%, -50%)'; element.setAttribute('aria-valuetext','Centered'); };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    if (!enabled()) { reset(); return; }
    const rect = element.getBoundingClientRect(), radius = rect.width * .32;
    const result = joystickVector(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2, radius);
    value.x = result.x; value.y = result.y;
    knob.style.transform = `translate(calc(-50% + ${result.knobX}px), calc(-50% + ${result.knobY}px))`;
    element.setAttribute('aria-valuetext',`Right ${result.x.toFixed(1)}, forward ${result.y.toFixed(1)}`);
  };
  element.addEventListener('pointerdown',e => { if (!enabled() || pointer !== null) return; e.preventDefault(); pointer=e.pointerId; element.setPointerCapture(e.pointerId); move(e); });
  element.addEventListener('pointermove',move);
  for (const event of ['pointerup','pointercancel','lostpointercapture'] as const) element.addEventListener(event,e => { if(e.pointerId===pointer)reset(); });
  addEventListener('blur',reset); document.addEventListener('visibilitychange',reset);
  return { value, reset };
}
