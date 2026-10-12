/**
 * `@play-ui/utils` — the small helpers every play-ui component is built from.
 *
 * `renderPart` renders a headless part as its own tag, or as whatever the
 * consumer's `render` prop asks for, with the part's props merged under the
 * consumer's. `prefersReducedMotion` decides whether to animate; `clamp` and
 * `lerp` are the math motion is made of.
 */
export { clamp, lerp } from "./math.ts";

export { prefersReducedMotion, type ReducedMotion } from "./reduced-motion.ts";

export {
  mergeRefs,
  renderPart,
  type PartProps,
  type Props,
  type RenderProp,
  type StateClassName,
} from "./react/render.ts";
