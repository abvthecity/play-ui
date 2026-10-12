/**
 * `@play-ui/react-cards` — a headless card stack.
 *
 * The parts own the interaction (drag, threshold, fling, keys, the order) and
 * the motion (every card's transform); what the cards look like, how big they
 * are and where they sit is entirely the consumer's.
 *
 * ```tsx
 * <CardStack.Root items={links} getKey={(link) => link.id} onSwipe={onSwipe}>
 *   <CardStack.Stage className="stage">
 *     <CardStack.Underlays className="card" />
 *     <CardStack.Cards className="card">
 *       {(link) => (
 *         <>
 *           <h2>{link.title}</h2>
 *           <CardStack.Indicator direction="right">Done</CardStack.Indicator>
 *           <CardStack.Shade className="shade" />
 *         </>
 *       )}
 *     </CardStack.Cards>
 *   </CardStack.Stage>
 *   <CardStack.Trigger direction="left">Keep</CardStack.Trigger>
 * </CardStack.Root>
 * ```
 *
 * `useSlideshow` is the same gesture laid flat: a row of slides of any size
 * that a swipe pulls along, one at a time, for a gallery. `useMorph` plays the
 * same cards from one layout to another, a stack to a grid and back.
 */
export * as CardStack from "./react/namespace.ts";

export { useCardStack } from "./react/parts.tsx";

export { createCardStack, type TypedCardStack } from "./react/typed.ts";

export {
  useSlideshow,
  type UseSlideshowOptions,
  type UseSlideshowResult,
} from "./react/use-slideshow.ts";

export {
  DEFAULT_SLIDESHOW_OPTIONS,
  SlideshowEngine,
  releaseTarget,
  slideOffset,
  type SlideshowHost,
  type SlideshowOptions,
} from "./slideshow.ts";

export { useMorph, type UseMorphResult } from "./react/use-morph.ts";

export {
  DEFAULT_MORPH_OPTIONS,
  MORPH_KEY_ATTRIBUTE,
  captureMorph,
  flipTransform,
  morphElements,
  playMorph,
  staggerDelay,
  type Box,
  type MorphOptions,
  type MorphRun,
  type MorphSnapshot,
  type PlayMorphOptions,
} from "./morph.ts";

export { useDock, type UseDockOptions, type UseDockResult } from "./react/use-dock.ts";

export {
  DOCK_POSITIONS,
  TUCK_FLING,
  TUCK_OVERHANG,
  dockAt,
  isDockPlace,
  isDockPosition,
  releasePlace,
  stepDock,
  stepPlace,
  tuckedSide,
  untuck,
  type DockPlace,
  type DockPosition,
  type Release,
  type TuckSide,
} from "./dock.ts";

export type {
  CardStackApi,
  CardStackCardState,
  CardStackCardsProps,
  CardStackIndicatorProps,
  CardStackIndicatorState,
  CardStackShadeProps,
  CardStackShadeState,
  CardStackStageProps,
  CardStackStageState,
  CardStackTriggerProps,
  CardStackTriggerState,
  CardStackUnderlayState,
  CardStackUnderlaysProps,
} from "./react/parts.tsx";

export type {
  CardStackActions,
  CardStackBackDetails,
  CardStackRootProps,
  CardStackRootState,
  CardStackSwipeDetails,
} from "./react/root.tsx";

export type { RenderProp, StateClassName } from "@play-ui/utils";

export {
  DEFAULT_CARD_STACK_OPTIONS,
  DEFAULT_SWIPE_EFFECTS,
  resolveOptions,
  type CardStackOptions,
  type ReducedMotion,
  type SwipeDirection,
  type SwipeEffect,
  type SwipeEffects,
  type TiltMode,
} from "./options.ts";

export { CardStackEngine, type CardStackHost, type VerticalDragEvent } from "./engine.ts";

export {
  cyclePath,
  dragProgress,
  halfSpan,
  liftedPose,
  lerpPose,
  poseTransform,
  releaseDirection,
  releaseVelocity,
  resist,
  restPose,
  springTiming,
  tiltFactor,
  type CyclePath,
  type DepthGeometry,
  type PointerSample,
  type Pose,
  type Spring,
  type SpringTiming,
} from "./physics.ts";

export { cycleKey, dismissKey, pruneDismissed, reconcileOrder } from "./stack.ts";

export {
  createDragCard,
  type DragCard,
  type DragCardOptions,
  type DragCardOutcome,
  type DragCardSnapshot,
  type DragCardView,
  type DragStartLike,
} from "./react/drag-card.ts";
