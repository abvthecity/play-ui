/**
 * `@play-ui/physics` — the motion math under play-ui's components, as pure
 * functions of numbers with no DOM in them.
 *
 * Springs sampled into CSS easings the Web Animations API can play, the
 * velocity a pointer left with, what a release means, and the path a thrown
 * element takes out and home.
 */
export { halfSpan } from "./geometry.ts";

export { springTiming, type Spring, type SpringTiming } from "./spring.ts";

export {
  dragProgress,
  releaseDirection,
  releaseVelocity,
  resist,
  tiltFactor,
  type PointerSample,
} from "./gesture.ts";

export { cyclePath, type CyclePath } from "./path.ts";
