import { AnchorProvider, TOCItem, type TOCItemType } from "fumadocs-core/toc";
import type { ReactElement, ReactNode } from "react";

/** "On this page": the page's headings, the one in view marked `data-active`. */
export function TableOfContents(props: { toc: TOCItemType[]; children: ReactNode }): ReactElement {
  return (
    <AnchorProvider toc={props.toc}>
      <div className="docs-main">
        {props.children}
        {props.toc.length > 0 ? (
          <nav className="toc" aria-label="On this page">
            <p className="toc-heading">On this page</p>
            <ul>
              {props.toc.map((item) => (
                <li key={item.url} data-depth={item.depth}>
                  <TOCItem href={item.url} className="toc-link">
                    {item.title}
                  </TOCItem>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </AnchorProvider>
  );
}
