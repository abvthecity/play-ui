import type { MDXComponents } from "mdx/types";

import { CardStackDemo } from "@/components/demos/card-stack-demo.tsx";
import { KeyboardDemo } from "@/components/demos/keyboard-demo.tsx";

/** Live examples, shown in a framed panel above their source. */
function Demo(props: { children: React.ReactNode }): React.ReactElement {
  return <div className="demo">{props.children}</div>;
}

/** A note set apart from the prose. */
function Callout(props: { title?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <aside className="callout">
      {props.title ? <p className="callout-title">{props.title}</p> : null}
      {props.children}
    </aside>
  );
}

export const mdxComponents: MDXComponents = {
  CardStackDemo,
  KeyboardDemo,
  Demo,
  Callout,
};
