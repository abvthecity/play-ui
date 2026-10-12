import { Deck, type DeckForm } from "@play-ui/react-deck";
import { useState, type ReactElement } from "react";

import { SegmentedControl } from "@/components/segmented-control.tsx";

type Facet = "about" | "notes" | "links" | "related";

const FACETS: readonly Facet[] = ["about", "notes", "links", "related"];

const LABELS: Record<Facet, string> = {
  about: "About",
  notes: "Notes",
  links: "Links",
  related: "Related",
};

const COUNTS: Record<Facet, string> = { about: "", notes: "3", links: "5", related: "4" };

type Motion = "full" | "reduced";

function isFacet(value: string): value is Facet {
  return FACETS.some((facet) => facet === value);
}

/** What each facet holds: plain markup, styled in `demos.css`. */
function FacetBody({ facet }: { facet: Facet }): ReactElement {
  switch (facet) {
    case "about":
      return (
        <>
          <p className="dk-big">6 min</p>
          <p>A short essay on why interfaces should feel like objects you can pick up.</p>
          <dl className="dk-facts">
            <div>
              <dt>Published</dt>
              <dd>12 October</dd>
            </div>
            <div>
              <dt>Words</dt>
              <dd>1,420</dd>
            </div>
          </dl>
        </>
      );
    case "notes":
      return (
        <ul className="dk-list">
          <li>“A card should land where your eye expects it.”</li>
          <li>Springs, not durations: the motion settles when it settles.</li>
          <li>Every gesture has a keyboard twin.</li>
        </ul>
      );
    case "links":
      return (
        <ul className="dk-list">
          <li>The physics of a thrown card</li>
          <li>Index cards as an interface</li>
          <li>Designing for reduced motion</li>
          <li>Folders, tabs and the desk metaphor</li>
          <li>On clip-path and compositor-only animation</li>
        </ul>
      );
    default:
      return (
        <ul className="dk-list">
          <li>Card stacks you can swipe</li>
          <li>A keyboard that lights its shortcuts</li>
          <li>Docks that tuck into the edge</li>
          <li>Galleries a finger pulls along</li>
        </ul>
      );
  }
}

/** A few grey lines that stand in for the page the deck sits beside. */
function Page(): ReactElement {
  return (
    <div className="dk-page" aria-hidden="true">
      <span className="dk-line dk-line-title" />
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} className="dk-line" data-short={index % 4 === 3 ? "" : undefined} />
      ))}
    </div>
  );
}

/**
 * The deck with a look: a pile in the corner of a page that deals out into a
 * folder with a tab per facet, or rises as a sheet. Everything visual lives
 * in `demos.css`.
 */
export function DeckDemo(): ReactElement {
  const [form, setForm] = useState<DeckForm>("folder");
  const [motion, setMotion] = useState<Motion>("full");
  const [value, setValue] = useState<Facet>("about");

  return (
    <div className="dk-demo">
      <div className="kb-settings">
        <SegmentedControl
          label="Form"
          value={form}
          onChange={setForm}
          options={[
            { value: "folder", label: "Folder" },
            { value: "sheet", label: "Sheet" },
          ]}
        />
        <SegmentedControl
          label="Motion"
          value={motion}
          onChange={setMotion}
          options={[
            { value: "full", label: "Full" },
            { value: "reduced", label: "Reduced" },
          ]}
        />
      </div>

      <div className="dk-stage">
        <Page />

        <Deck.Root
          // A new deck for a new form, so a folder never turns into a sheet mid-flight.
          key={form}
          className="dk-deck"
          values={FACETS}
          value={value}
          onValueChange={(next) => {
            if (isFacet(next)) setValue(next);
          }}
          form={form}
          reducedMotion={motion === "reduced" ? "always" : "system"}
        >
          <Deck.Pile className="dk-pile" aria-label="About this page, open the folder">
            {FACETS.slice(1).map((facet, index) => (
              <span key={facet} className="dk-stub" data-value={facet} data-index={index}>
                {COUNTS[facet]}
              </span>
            ))}
            <Deck.PileCard className="dk-card" data-value="about">
              <small>
                <span>About</span>
                <kbd>i</kbd>
              </small>
              <b>6 min</b>
            </Deck.PileCard>
          </Deck.Pile>

          {form === "sheet" ? <Deck.Backdrop className="dk-scrim" /> : null}

          <Deck.Folder
            className={form === "sheet" ? "dk-phone" : "dk-folder"}
            aria-label="About this page"
          >
            {form === "folder" ? (
              <Deck.Tabs className="dk-tabs" aria-label="Facets">
                {FACETS.map((facet) => (
                  <Deck.Tab key={facet} value={facet} className="dk-tab">
                    {LABELS[facet]}
                  </Deck.Tab>
                ))}
              </Deck.Tabs>
            ) : null}

            <Deck.Surface className={form === "sheet" ? "dk-sheet dk-sheet-phone" : "dk-sheet"}>
              <div className="dk-head">
                <h3>{LABELS[value]}</h3>
                <Deck.Close className="dk-close" aria-label="Put the folder away">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </Deck.Close>
              </div>

              {form === "sheet" ? (
                <Deck.Tabs className="dk-pills" aria-label="Facets">
                  {FACETS.map((facet) => (
                    <Deck.Tab key={facet} value={facet} className="dk-pill">
                      {LABELS[facet]}
                    </Deck.Tab>
                  ))}
                </Deck.Tabs>
              ) : null}

              {FACETS.map((facet) => (
                <Deck.Panel key={facet} value={facet} className="dk-panel">
                  <FacetBody facet={facet} />
                </Deck.Panel>
              ))}

              <p className="dk-foot">
                <kbd>1</kbd>–<kbd>4</kbd> flip · <kbd>esc</kbd> puts it away
              </p>
            </Deck.Surface>
          </Deck.Folder>
        </Deck.Root>
      </div>
    </div>
  );
}
