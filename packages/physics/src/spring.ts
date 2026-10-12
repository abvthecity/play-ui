/**
 * Springs, stepped in plain numbers or sampled into a CSS easing, so the Web
 * Animations API can play them without a frame loop.
 */

/** A damped spring with unit-free parameters, the same shape Motion takes. */
export interface Spring {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

/** A spring as the Web Animations API takes it. */
export interface SpringTiming {
  /** Milliseconds from released to at rest. */
  readonly duration: number;
  /** A CSS `linear()` easing that traces the spring's own displacement. */
  readonly easing: string;
}

const timingCache = new Map<string, SpringTiming>();

/**
 * A spring from rest to rest, sampled into a CSS `linear()` easing.
 *
 * At rest means within a hundredth of the distance, which is where the
 * duration ends; the last sample is pinned to 1 so nothing lands short.
 */
export function springTiming(spring: Spring, samples = 40): SpringTiming {
  const key = `${spring.stiffness}/${spring.damping}/${spring.mass}/${samples}`;
  const cached = timingCache.get(key);

  if (cached) return cached;

  const frequency = Math.sqrt(spring.stiffness / spring.mass);
  const ratio = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  const damped = frequency * Math.sqrt(Math.max(0, 1 - ratio * ratio));

  const remaining = (seconds: number): number =>
    damped === 0
      ? (1 + frequency * seconds) * Math.exp(-frequency * seconds)
      : Math.exp(-ratio * frequency * seconds) *
        (Math.cos(damped * seconds) + ((ratio * frequency) / damped) * Math.sin(damped * seconds));

  let duration = 1;

  for (let ms = 1; ms <= 2000; ms += 1) {
    if (Math.abs(remaining(ms / 1000)) >= 0.01) duration = ms + 1;
  }

  const points = Array.from({ length: samples + 1 }, (_, index) =>
    index === samples ? "1" : (1 - remaining((duration * (index / samples)) / 1000)).toFixed(4),
  );
  const timing = { duration, easing: `linear(${points.join(", ")})` };

  timingCache.set(key, timing);

  return timing;
}
