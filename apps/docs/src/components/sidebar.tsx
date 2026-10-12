import { Link } from "@tanstack/react-router";
import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactElement } from "react";

import { docsSplat } from "@/lib/site.ts";

/**
 * The docs' navigation: each top-level folder is a section with a heading,
 * and its pages are a flat list beneath it.
 */
export function Sidebar(props: {
  tree: PageTree.Root;
  current: string;
  open: boolean;
  onNavigate: () => void;
}): ReactElement {
  return (
    <nav className="sidebar" aria-label="Docs" data-open={props.open ? "" : undefined}>
      {props.tree.children.map((node, index) => (
        <SidebarNode
          key={node.$id ?? index}
          node={node}
          current={props.current}
          onNavigate={props.onNavigate}
        />
      ))}
    </nav>
  );
}

function SidebarNode(props: {
  node: PageTree.Node;
  current: string;
  onNavigate: () => void;
}): ReactElement | null {
  const { node } = props;

  if (node.type === "separator") return <p className="sidebar-heading">{node.name}</p>;

  if (node.type === "page") return <SidebarLink {...props} item={node} />;

  const items = node.index ? [node.index, ...node.children] : node.children;

  return (
    <section className="sidebar-section">
      <p className="sidebar-heading">{node.name}</p>
      <ul>
        {items.map((child) =>
          child.type === "page" ? (
            <li key={child.url}>
              <SidebarLink item={child} current={props.current} onNavigate={props.onNavigate} />
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

function SidebarLink(props: {
  item: PageTree.Item;
  current: string;
  onNavigate: () => void;
}): ReactElement {
  const active = props.item.url === props.current;

  return (
    <Link
      to="/docs/$"
      params={{ _splat: docsSplat(props.item.url) }}
      className="sidebar-link"
      aria-current={active ? "page" : undefined}
      onClick={props.onNavigate}
    >
      {props.item.name}
    </Link>
  );
}
