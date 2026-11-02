export const WALK = 105;
export const RUN = 175;
export function staminaStep(stamina: number, moving: boolean, sprint: boolean, exhausted: boolean, dt: number) {
  const running = moving && sprint && !exhausted && stamina > 0;
  const value = Math.max(0, Math.min(100, stamina + (running ? -32 : 18) * dt));
  return { value, running, exhausted: value <= 0 || (exhausted && value < 30) };
}
export function direction(x: number, y: number) {
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
