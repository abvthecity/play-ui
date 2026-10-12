import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { findNeighbour } from "fumadocs-core/page-tree";
import { Suspense, use, useState, type ReactElement } from "react";

import { mdxComponents } from "@/components/mdx.tsx";
import { Sidebar } from "@/components/sidebar.tsx";
import { SiteHeader } from "@/components/site-header.tsx";
import { TableOfContents } from "@/components/toc.tsx";
import { docsHome, docsSplat, githubUrl, siteName } from "@/lib/site.ts";
import { docs, source } from "@/lib/source.ts";

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = (params._splat ?? "").split("/").filter(Boolean);

    if (slugs.length === 0)
      throw redirect({ to: "/docs/$", params: { _splat: docsSplat(docsHome) } });

    const page = source.getPage(slugs);

    if (!page) throw notFound();

    await docs.getPage(page.path)?.preload();

    return {
      path: page.path,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} · ${siteName}` },
          ...(loaderData.description
            ? [{ name: "description", content: loaderData.description }]
            : []),
        ]
      : [],
  }),
  component: DocsPage,
});

function DocsPage(): ReactElement {
  const { path, url } = Route.useLoaderData();
  const [menuOpen, setMenuOpen] = useState(false);
  const tree = source.getPageTree();

  return (
    <div className="docs">
      <SiteHeader>
        <button
          type="button"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="docs-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </SiteHeader>
      <div className="docs-body">
        <div id="docs-sidebar" className="sidebar-wrap">
          <Sidebar
            tree={tree}
            current={url}
            open={menuOpen}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
        <Suspense>
          <Article path={path} url={url} />
        </Suspense>
      </div>
    </div>
  );
}

function Article(props: { path: string; url: string }): ReactElement {
  const page = docs.getPage(props.path);

  if (!page) throw new Error(`No docs entry for ${props.path}`);

  const { toc } = use(page.load());
  const Body = page.body;
  const neighbours = findNeighbour(source.getPageTree(), props.url);

  return (
    <TableOfContents toc={toc}>
      <main className="article">
        <header className="article-header">
          <h1>{page.title}</h1>
          {page.description ? <p className="article-description">{page.description}</p> : null}
        </header>
        <div className="prose">
          <Body components={mdxComponents} />
        </div>
        <footer className="article-footer">
          <nav className="pager" aria-label="Pages">
            {neighbours.previous ? (
              <Link to="/docs/$" params={{ _splat: docsSplat(neighbours.previous.url) }} rel="prev">
                <span className="pager-label">Previous</span>
                {neighbours.previous.name}
              </Link>
            ) : (
              <span />
            )}
            {neighbours.next ? (
              <Link
                to="/docs/$"
                params={{ _splat: docsSplat(neighbours.next.url) }}
                rel="next"
                className="pager-next"
              >
                <span className="pager-label">Next</span>
                {neighbours.next.name}
              </Link>
            ) : null}
          </nav>
          <a
            className="edit-link"
            href={`${githubUrl}/blob/main/apps/docs/content/docs/${props.path}`}
            target="_blank"
            rel="noreferrer"
          >
            Edit this page on GitHub
          </a>
        </footer>
      </main>
    </TableOfContents>
  );
}
