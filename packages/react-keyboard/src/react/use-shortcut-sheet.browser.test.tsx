import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";

import { useShortcutSheet, type ShortcutGroup } from "../index.ts";

const GROUPS: ShortcutGroup[] = [
  {
    id: "move",
    title: "Move",
    items: [
      { id: "next", label: "Next link", hotkey: "J" },
      { id: "previous", label: "Previous link", hotkey: "K" },
    ],
  },
];

function Sheet(): ReactElement {
  const { query, setQuery, results, active, point, onInputKeyDown, attachList } =
    useShortcutSheet(GROUPS);

  return (
    <>
      <input
        aria-label="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onInputKeyDown}
      />
      <output data-testid="active">{active?.id ?? "none"}</output>
      <ul ref={attachList}>
        {results.flatMap((group) =>
          group.items.map((item) => (
            <li key={item.id} data-shortcut-id={item.id} onPointerEnter={() => point(item.id)}>
              {item.label}
            </li>
          )),
        )}
      </ul>
    </>
  );
}

/** The sheet's search and its active row. */
describe("useShortcutSheet", () => {
  it("makes the first result active while there is a query", async () => {
    const screen = await render(<Sheet />);

    await expect.element(screen.getByTestId("active")).toHaveTextContent("none");
    await userEvent.type(screen.getByLabelText("Search"), "link");
    await expect.element(screen.getByTestId("active")).toHaveTextContent("next");
  });

  it("walks the rows with the arrows from the search field", async () => {
    const screen = await render(<Sheet />);

    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(screen.getByTestId("active")).toHaveTextContent("next");
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(screen.getByTestId("active")).toHaveTextContent("previous");
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(screen.getByTestId("active")).toHaveTextContent("next");
  });
});
