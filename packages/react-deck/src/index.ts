/**
 * `@play-ui/react-deck` — a deck of index cards, headless.
 *
 * Put away, the deck is a small pile. Dealt, its top card flies out and grows
 * into a folder with a tab per facet down its edge; a tab flips the folder to
 * that facet. On a phone the same facets are a sheet that rises from the foot
 * of the screen. The package owns the flights between the pile and the
 * folder, the flip, the tab list, the keys and the dialog; what any of it
 * looks like, and what each facet holds, is the consumer's.
 *
 * ```tsx
 * <Deck.Root values={["about", "notes", "links"]}>
 *   <Deck.Pile className="pile" aria-label="Open the folder">
 *     <Deck.PileCard className="card">About</Deck.PileCard>
 *   </Deck.Pile>
 *   <Deck.Folder className="folder" aria-label="About this page">
 *     <Deck.Tabs className="tabs" aria-label="Facets">
 *       <Deck.Tab value="about">About</Deck.Tab>
 *       …
 *     </Deck.Tabs>
 *     <Deck.Surface className="sheet">
 *       <Deck.Close aria-label="Put the folder away">×</Deck.Close>
 *       <Deck.Panel value="about">…</Deck.Panel>
 *     </Deck.Surface>
 *   </Deck.Folder>
 * </Deck.Root>
 * ```
 */
export * as Deck from "./react/namespace.ts";

export type { DeckForm, DeckPhase } from "./react/context.ts";

export type {
  DeckBackdropProps,
  DeckCloseProps,
  DeckFolderProps,
  DeckPanelProps,
  DeckPartState,
  DeckPileCardProps,
  DeckPileProps,
  DeckStepProps,
  DeckSurfaceProps,
  DeckTabProps,
  DeckTabState,
  DeckTabsProps,
} from "./react/parts.tsx";

export type { DeckRootProps, DeckRootState } from "./react/root.tsx";

export { OPEN_DECK_EVENT, openDeck, type OpenDeckDetail } from "./events.ts";

export { deckKeyAction, tabStep, type DeckKeyAction, type DeckKeyEvent } from "./keys.ts";

export {
  DEFAULT_DECK_MOTION,
  flipDirection,
  pileClip,
  pileFlight,
  pileTransform,
  putAwayTimeline,
  resolveDeckMotion,
  roundedInset,
  SHADOW_ROOM,
  type Box,
  type Corner,
  type Corners,
  type DeckMotionOptions,
  type PutAwayTimeline,
} from "./motion.ts";

export {
  SWIPE_CLOSE_FRACTION,
  SWIPE_CLOSE_VELOCITY,
  SWIPE_SLOP,
  swipeToDismiss,
} from "./swipe-dismiss.ts";
