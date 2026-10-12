import { Link } from "@tanstack/react-router";
import type { ReactElement, ReactNode } from "react";

import { docsHome, docsSplat, githubUrl, siteName } from "@/lib/site.ts";

export function SiteHeader(props: { children?: ReactNode }): ReactElement {
  return (
    <header className="site-header">
      {props.children}
      <Link to="/" className="wordmark">
        {siteName}
      </Link>
      <nav className="site-nav" aria-label="Site">
        <Link to="/docs/$" params={{ _splat: docsSplat(docsHome) }}>
          Docs
        </Link>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
