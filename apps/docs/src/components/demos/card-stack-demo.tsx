import { CardStack, createCardStack } from "@play-ui/react-cards";
import { useState, type ReactElement } from "react";

interface Note {
  id: string;
  kicker: string;
  title: string;
  body: string;
}

const NOTES: readonly Note[] = [
  {
    id: "drag",
    kicker: "Drag",
    title: "Throw a card either way",
    body: "Past the threshold it goes; short of it, it springs home. A quick flick counts too.",
  },
  {
    id: "keys",
    kicker: "Keys",
    title: "Arrow keys work as well",
    body: "Focus the stack and press ← or →. Every gesture has a keyboard twin.",
  },
  {
    id: "motion",
    kicker: "Motion",
    title: "Springs, not timers",
    body: "A kept card leaves at the speed you threw it and springs back into the pile.",
  },
  {
    id: "headless",
    kicker: "Headless",
    title: "Every pixel here is yours",
    body: "The package draws nothing. These colours, sizes and labels are plain CSS.",
  },
  {
    id: "reduced",
    kicker: "Reduced motion",
    title: "Calm when asked",
    body: "With reduced motion on, a swipe lands at once, without the flight.",
  },
];

const NoteStack = createCardStack<Note>();

/**
 * The card stack with a look: left sends the top card to the bottom, right
 * puts it away. Everything visual lives in `demos.css`.
 */
export function CardStackDemo(): ReactElement {
  const [notes, setNotes] = useState<Note[]>(() => [...NOTES]);

  return (
    <NoteStack.Root
      items={notes}
      getKey={(note) => note.id}
      announce={(top) => (top ? `Now showing: ${top.title}` : "All done")}
      onSwipe={(details) => {
        if (details.effect === "dismiss")
          setNotes((previous) => previous.filter((note) => note.id !== details.key));
      }}
      className="demo-stack"
    >
      {notes.length === 0 ? (
        <div className="demo-empty">
          <p>All done.</p>
          <button type="button" className="demo-act" onClick={() => setNotes([...NOTES])}>
            Deal again
          </button>
        </div>
      ) : (
        <>
          <NoteStack.Stage className="demo-stage" role="group" aria-label="Demo cards">
            <CardStack.Underlays className="demo-card">
              {() => (
                <div className="demo-face">
                  <CardStack.Shade className="demo-shade" />
                </div>
              )}
            </CardStack.Underlays>
            <NoteStack.Cards className="demo-card">
              {(note) => (
                <div className="demo-face" key={note.id}>
                  <p className="demo-kicker">{note.kicker}</p>
                  <h3 className="demo-title">{note.title}</h3>
                  <p className="demo-text">{note.body}</p>
                  <CardStack.Indicator direction="right" className="demo-tint demo-tint-done" />
                  <CardStack.Indicator direction="left" className="demo-tint demo-tint-later" />
                  <CardStack.Indicator direction="right" className="demo-stamp demo-stamp-done">
                    Done
                  </CardStack.Indicator>
                  <CardStack.Indicator direction="left" className="demo-stamp demo-stamp-later">
                    Later
                  </CardStack.Indicator>
                  <CardStack.Shade className="demo-shade" />
                </div>
              )}
            </NoteStack.Cards>
          </NoteStack.Stage>
          <div className="demo-controls">
            <CardStack.Trigger direction="left" className="demo-act">
              ← Later
            </CardStack.Trigger>
            <CardStack.Trigger direction="right" className="demo-act">
              Done →
            </CardStack.Trigger>
          </div>
        </>
      )}
    </NoteStack.Root>
  );
}
